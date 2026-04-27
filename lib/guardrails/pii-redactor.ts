/** Light PII redaction for log payloads. NOT for live transcript display. */
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CC = /\b(?:\d[ -]?){13,19}\b/g;
const PHONE = /\b\+?1?[ -]?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}\b/g;
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;
const DOB = /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b/g;

export function redactPII(s: string): string {
  return s
    .replace(SSN, "[ssn]")
    .replace(CC, "[card]")
    .replace(PHONE, "[phone]")
    .replace(EMAIL, "[email]")
    .replace(DOB, "[dob]");
}
