export type LeadSegment = "hot" | "warm" | "cold";
export type ProductAssignment = "andy_outbound" | "andy_inbound" | "rvm_drop" | "hold" | "suppress";
export type DropDeliveryStatus = "pending" | "delivered" | "failed" | "rejected";
export type SuppressionReason = "opt_out" | "dnc_federal" | "dnc_state" | "litigator" | "reassigned" | "manual";

export interface Lead {
  id: string;
  livevox_contact_id: string | null;
  phone_e164: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  enrollment_date: string;              // ISO date
  last_transaction_date: string | null;
  segment: LeadSegment;
  product_assignment: ProductAssignment;
  callback_number_assigned: string | null;
  dnc: boolean;
  tcpa_consent: boolean;
  state: string | null;
  fl_geofence_cleared: boolean;
  carrier: string | null;
}

export interface ComplianceCheckResult {
  blocked: boolean;
  reason?: SuppressionReason;
  detail?: string;
  queriedAt: string;
}

export interface ComplianceBundle {
  federalDnc: ComplianceCheckResult;
  stateDnc: ComplianceCheckResult;
  rnd: ComplianceCheckResult;
  litigator: ComplianceCheckResult;
  internalSuppression: ComplianceCheckResult;
  overallPass: boolean;
}

export interface QCResult {
  passed: boolean;
  durationS: number;
  reason?: string;
  transcript?: string;
  confidence?: number;
}

export interface GenerationResult {
  success: boolean;
  leadId: string;
  audioUrl?: string;
  scriptHash?: string;
  durationS?: number;
  cacheHit?: boolean;
  compliance?: ComplianceBundle;
  qc?: QCResult;
  dropCowboyId?: string;
  queued?: boolean;
  errorReason?: string;
}

export interface BatchSummary {
  leadsProcessed: number;
  leadsEligible: number;
  dropsGenerated: number;
  dropsQueued: number;
  cacheHits: number;
  qcFailures: number;
  complianceRejections: number;
  errors: number;
  durationMs: number;
}

export interface ScriptTemplate {
  id: string;
  version: number;
  name: string;
  body: string;
  targetSegment: LeadSegment;
  targetDurationMinS: number;
  targetDurationMaxS: number;
}

export interface RvmCampaign {
  id: string;
  name: string;
  client: string;
  scriptTemplateId: string;
  voiceCloneId: string;
  callbackNumber: string;
  offerDisplay: string | null;  // campaign-specific override; null = use facts.json default
  targetSegment: LeadSegment;
  dailyCap: number;
  weeklyCap: number;
  status: "draft" | "active" | "paused" | "complete";
  pilotWeek: number | null;
}
