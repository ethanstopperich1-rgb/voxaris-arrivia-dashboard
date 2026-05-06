import { createHash } from "crypto";
import { redis } from "@/lib/clients/redis";
import { supabaseAdmin } from "@/lib/clients/supabase-admin";

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const REDIS_PREFIX = "rvm_audio:";

export function computeScriptHash(script: string): string {
  return createHash("sha256").update(script, "utf8").digest("hex");
}

// ─────────────────────────────────────────────
// Read — Redis first, fall back to Supabase
// ─────────────────────────────────────────────
export async function getCachedAudioUrl(scriptHash: string): Promise<string | null> {
  // L1: Redis (fast)
  const cached = await redis().get<string>(`${REDIS_PREFIX}${scriptHash}`);
  if (cached) return cached;

  // L2: Supabase (survives Redis flush, checks expiry)
  const { data } = await supabaseAdmin()
    .from("generation_cache")
    .select("audio_url, expires_at, qc_passed")
    .eq("script_hash", scriptHash)
    .maybeSingle();

  if (!data) return null;
  if (!data.qc_passed) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  // Backfill Redis
  await redis().setex(`${REDIS_PREFIX}${scriptHash}`, CACHE_TTL_SECONDS, data.audio_url);

  return data.audio_url;
}

// ─────────────────────────────────────────────
// Write — both layers
// ─────────────────────────────────────────────
export async function setCachedAudioUrl(
  scriptHash: string,
  audioUrl: string,
  voiceCloneId: string,
  durationS: number,
  qcPassed: boolean
): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString();

  await Promise.all([
    // L1: Redis
    redis().setex(`${REDIS_PREFIX}${scriptHash}`, CACHE_TTL_SECONDS, audioUrl),

    // L2: Supabase
    supabaseAdmin()
      .from("generation_cache")
      .upsert({
        script_hash: scriptHash,
        audio_url: audioUrl,
        voice_clone_id: voiceCloneId,
        duration_s: durationS,
        qc_passed: qcPassed,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .then(({ error }) => {
        if (error) console.error("[generation-cache] Supabase write error:", error);
      }),
  ]);
}
