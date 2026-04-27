import { env } from "@/lib/config/env";

export type HeliconeProps = {
  callId?: string;
  intent?: string;
  evidenceIds?: string[];
  verificationStatus?: string;
  answerCardId?: string;
  agentVersion?: string;
};

export function heliconeHeaders(props: HeliconeProps): Record<string, string> {
  const e = env();
  if (!e.HELICONE_API_KEY) return {};
  const h: Record<string, string> = {};
  if (props.callId) h["Helicone-Property-CallId"] = props.callId;
  if (props.intent) h["Helicone-Property-Intent"] = props.intent;
  if (props.evidenceIds?.length)
    h["Helicone-Property-EvidenceIds"] = props.evidenceIds.join(",");
  if (props.verificationStatus)
    h["Helicone-Property-VerificationStatus"] = props.verificationStatus;
  if (props.answerCardId) h["Helicone-Property-AnswerCardId"] = props.answerCardId;
  if (props.agentVersion) h["Helicone-Property-AgentVersion"] = props.agentVersion;
  return h;
}
