import { supabaseAdmin } from "@/lib/clients/supabase-admin";
import { rimeClient } from "@/lib/clients/rime";
import { dropCowboyClient } from "@/lib/clients/drop-cowboy";
import { env } from "@/lib/config/env";
import { runComplianceGate, suppressPhone } from "./compliance-gate";
import { runAudioQc } from "./audio-qc";
import { getCachedAudioUrl, setCachedAudioUrl, computeScriptHash } from "./generation-cache";
import { renderScript } from "./script-renderer";
import { cacheDropByPhone } from "./drop-cache";
import type {
  Lead,
  RvmCampaign,
  ScriptTemplate,
  GenerationResult,
  BatchSummary,
  ComplianceBundle,
  SuppressionReason,
} from "./types";

const QC_RETRY_LIMIT = 2;

// ─────────────────────────────────────────────
// Fetch campaign + script template
// ─────────────────────────────────────────────
async function fetchActiveCampaign(): Promise<{
  campaign: RvmCampaign;
  template: ScriptTemplate;
  voiceCloneId: string;
}> {
  const db = supabaseAdmin();

  const { data: campaign, error: camErr } = await db
    .from("rvm_campaigns")
    .select("*, rvm_script_templates(*), voice_clones(*)")
    .eq("status", "active")
    .maybeSingle();

  if (camErr || !campaign) {
    throw new Error("No active RVM campaign found");
  }

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      client: campaign.client,
      scriptTemplateId: campaign.script_template_id,
      voiceCloneId: campaign.voice_clone_id,
      callbackNumber: campaign.callback_number,
      offerDisplay: campaign.offer_display,
      targetSegment: campaign.target_segment,
      dailyCap: campaign.daily_cap,
      weeklyCap: campaign.weekly_cap,
      status: campaign.status,
      pilotWeek: campaign.pilot_week,
    },
    template: {
      id: campaign.rvm_script_templates.id,
      version: campaign.rvm_script_templates.version,
      name: campaign.rvm_script_templates.name,
      body: campaign.rvm_script_templates.body,
      targetSegment: campaign.rvm_script_templates.target_segment,
      targetDurationMinS: campaign.rvm_script_templates.target_duration_min_s,
      targetDurationMaxS: campaign.rvm_script_templates.target_duration_max_s,
    },
    voiceCloneId: campaign.voice_clones.rime_clone_id,
  };
}

// ─────────────────────────────────────────────
// Fetch eligible leads
// ─────────────────────────────────────────────
async function fetchEligibleLeads(campaign: RvmCampaign, limit: number): Promise<Lead[]> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .eq("segment", campaign.targetSegment)
    .eq("product_assignment", "rvm_drop")
    .eq("dnc", false)
    .eq("tcpa_consent", true)
    .not("state", "eq", "FL")            // FL geofence
    .not("state", "is", null)            // unknown state = hold
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Lead fetch error: ${error.message}`);
  return (data ?? []) as Lead[];
}

// ─────────────────────────────────────────────
// Upload MP3 to Supabase Storage
// ─────────────────────────────────────────────
async function uploadAudio(mp3Buffer: Buffer, path: string): Promise<string> {
  const bucket = env().RVM_STORAGE_BUCKET;
  const { data, error } = await supabaseAdmin().storage
    .from(bucket)
    .upload(path, mp3Buffer, { contentType: "audio/mp3", upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabaseAdmin().storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ─────────────────────────────────────────────
// Generate one drop (compliance → cache → Rime → QC → upload)
// ─────────────────────────────────────────────
async function generateOne(
  lead: Lead,
  campaign: RvmCampaign,
  template: ScriptTemplate,
  voiceCloneId: string
): Promise<GenerationResult> {
  // 1. Compliance gate
  let compliance: ComplianceBundle;
  try {
    compliance = await runComplianceGate(lead);
  } catch (err) {
    return { success: false, leadId: lead.id, errorReason: `compliance_error: ${err}` };
  }

  if (!compliance.overallPass) {
    const blockingCheck = [
      compliance.internalSuppression,
      compliance.federalDnc,
      compliance.stateDnc,
      compliance.rnd,
      compliance.litigator,
    ].find((c) => c.blocked);

    if (blockingCheck?.reason) {
      await suppressPhone(lead.phone_e164, blockingCheck.reason as SuppressionReason, "compliance_gate");
    }

    return {
      success: false,
      leadId: lead.id,
      compliance,
      errorReason: `compliance_blocked: ${blockingCheck?.reason ?? "unknown"}`,
    };
  }

  // 2. Render script
  const script = renderScript(template, lead, campaign);
  const hash = computeScriptHash(script);

  // 3. Cache hit?
  const cachedUrl = await getCachedAudioUrl(hash);
  if (cachedUrl) {
    return {
      success: true,
      leadId: lead.id,
      audioUrl: cachedUrl,
      scriptHash: hash,
      cacheHit: true,
      compliance,
    };
  }

  // 4. Generate via Rime Mist v3
  let mp3Buffer: Buffer | null = null;
  let qc = null;

  for (let attempt = 0; attempt <= QC_RETRY_LIMIT; attempt++) {
    try {
      mp3Buffer = await rimeClient().generate({
        text: script,
        voiceId: voiceCloneId,
        speedAlpha: 1.0,
        sampleRate: 22050,
      });
    } catch (err) {
      return { success: false, leadId: lead.id, errorReason: `rime_error: ${err}`, compliance };
    }

    qc = await runAudioQc(mp3Buffer, lead.first_name ?? "there");
    if (qc.passed) break;

    if (attempt === QC_RETRY_LIMIT) {
      return {
        success: false,
        leadId: lead.id,
        qc,
        compliance,
        errorReason: `qc_failed_after_${QC_RETRY_LIMIT}_retries: ${qc.reason}`,
      };
    }
  }

  if (!mp3Buffer || !qc) {
    return { success: false, leadId: lead.id, errorReason: "generation_no_output" };
  }

  // 5. Upload
  const today = new Date().toISOString().slice(0, 10);
  const audioUrl = await uploadAudio(mp3Buffer, `rvm/${today}/${lead.id}-${hash.slice(0, 8)}.mp3`);

  // 6. Cache write
  await setCachedAudioUrl(hash, audioUrl, voiceCloneId, qc.durationS, qc.passed);

  return {
    success: true,
    leadId: lead.id,
    audioUrl,
    scriptHash: hash,
    durationS: qc.durationS,
    cacheHit: false,
    qc,
    compliance,
  };
}

// ─────────────────────────────────────────────
// Queue to Drop Cowboy + write DB records
// ─────────────────────────────────────────────
async function queueDrops(
  results: GenerationResult[],
  leads: Lead[],
  campaign: RvmCampaign,
  template: ScriptTemplate
): Promise<void> {
  const db = supabaseAdmin();
  const leadMap = new Map(leads.map((l) => [l.id, l]));

  for (const result of results) {
    if (!result.success || !result.audioUrl) continue;
    const lead = leadMap.get(result.leadId);
    if (!lead) continue;

    try {
      const dropResult = await dropCowboyClient().createDrop({
        audioUrl: result.audioUrl,
        phoneNumbers: [lead.phone_e164],
        campaignName: campaign.name,
        callbackNumber: campaign.callbackNumber,
      });

      await db.from("rvm_drops").insert({
        lead_id: result.leadId,
        campaign_id: campaign.id,
        drop_cowboy_id: dropResult.dropId,
        audio_url: result.audioUrl,
        script_hash: result.scriptHash,
        script_template_version: template.version,
        callback_number: campaign.callbackNumber,
        scheduled_at: new Date().toISOString(),
        delivery_status: "pending",
        cost_usd: dropResult.estimatedCostUsd ?? null,
      });

      result.dropCowboyId = dropResult.dropId;
      result.queued = true;

      // Cache by phone so the Twilio callback webhook can look up the drop instantly
      await cacheDropByPhone(lead.phone_e164, {
        leadId: result.leadId,
        dropId: dropResult.dropId,
        campaignId: campaign.id,
        campaignName: campaign.name,
        firstName: lead.first_name ?? "there",
        enrollmentDate: lead.enrollment_date,
        offerDisplay: campaign.offerDisplay,
        callbackNumber: campaign.callbackNumber,
        droppedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[pipeline] Drop Cowboy queue failed for lead ${result.leadId}:`, err);
    }
  }
}

// ─────────────────────────────────────────────
// Write compliance audit log
// ─────────────────────────────────────────────
async function writeAuditLog(results: GenerationResult[], leads: Lead[]): Promise<void> {
  const leadMap = new Map(leads.map((l) => [l.id, l]));
  const records = results.map((result) => {
    const lead = leadMap.get(result.leadId);
    return {
      lead_id: result.leadId,
      drop_timestamp: new Date().toISOString(),
      phone_e164: lead?.phone_e164 ?? "unknown",
      consent_provenance: {
        source: "gvr_membership",
        signup_date: lead?.enrollment_date ?? null,
        tc_version: "2026-04-10",
        consent_language: "artificial voice + prerecorded + autodialed",
      },
      dnc_check_result: result.compliance?.federalDnc ?? {},
      rnd_result: result.compliance?.rnd ?? null,
      litigator_result: result.compliance?.litigator ?? null,
      script_hash: result.scriptHash ?? null,
      audio_url: result.audioUrl ?? null,
      callback_received: false,
    };
  });

  const { error } = await supabaseAdmin().from("rvm_compliance_audit").insert(records);
  if (error) console.error("[pipeline] Audit log write error:", error);
}

// ─────────────────────────────────────────────
// Update daily metrics rollup
// ─────────────────────────────────────────────
async function updateDailyMetrics(summary: Omit<BatchSummary, "durationMs">): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await supabaseAdmin()
    .from("rvm_daily_metrics")
    .upsert(
      {
        date: today,
        drops_attempted: summary.leadsEligible,
        drops_delivered: summary.dropsQueued,
        drops_failed: summary.errors + summary.qcFailures,
        cache_hits: summary.cacheHits,
        qc_fail_count: summary.qcFailures,
        suppression_events: summary.complianceRejections,
      },
      { onConflict: "date" }
    );
}

// ─────────────────────────────────────────────
// Main batch entry point
// ─────────────────────────────────────────────
export async function runDailyBatch(opts?: { leadLimit?: number }): Promise<BatchSummary> {
  const startMs = Date.now();
  const { campaign, template, voiceCloneId } = await fetchActiveCampaign();
  const limit = opts?.leadLimit ?? env().RVM_DAILY_CAP;
  const concurrency = env().RVM_CONCURRENT_GENERATIONS;

  const leads = await fetchEligibleLeads(campaign, limit);

  // Process in batches of `concurrency` to avoid overwhelming Rime API
  const results: GenerationResult[] = [];
  for (let i = 0; i < leads.length; i += concurrency) {
    const batch = leads.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((lead) => generateOne(lead, campaign, template, voiceCloneId))
    );
    results.push(...batchResults);
  }

  const successful = results.filter((r) => r.success);
  await queueDrops(successful, leads, campaign, template);
  await writeAuditLog(results, leads);

  const summary: Omit<BatchSummary, "durationMs"> = {
    leadsProcessed: leads.length,
    leadsEligible: results.filter((r) => r.compliance?.overallPass !== false).length,
    dropsGenerated: successful.length,
    dropsQueued: successful.filter((r) => r.queued).length,
    cacheHits: successful.filter((r) => r.cacheHit).length,
    qcFailures: results.filter((r) => !r.success && r.errorReason?.startsWith("qc_failed")).length,
    complianceRejections: results.filter((r) => !r.success && r.errorReason?.startsWith("compliance")).length,
    errors: results.filter((r) => !r.success && !r.errorReason?.startsWith("qc_failed") && !r.errorReason?.startsWith("compliance")).length,
  };

  await updateDailyMetrics(summary);

  return { ...summary, durationMs: Date.now() - startMs };
}
