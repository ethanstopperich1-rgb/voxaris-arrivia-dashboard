import twilio, { type Twilio } from "twilio";
import { env } from "@/lib/config/env";

let _client: Twilio | null = null;

export function twilioClient(): Twilio {
  if (_client) return _client;
  const e = env();
  _client = twilio(e.TWILIO_ACCOUNT_SID, e.TWILIO_AUTH_TOKEN);
  return _client;
}
