# PII Handling

## Policy
The voice agent does not collect or process PII (SSN, credit card, full DOB, member ID, account password). If a caller volunteers PII, the agent gently stops them and transfers to a verified specialist.

## Why
PII collected over an unauthenticated voice channel is a security risk. Verified specialists collect this through controlled workflows.

## Logging
Logs are PII-redacted via lib/guardrails/pii-redactor.ts. Transcripts shown in the dashboard are not redacted; access is restricted via Basic Auth on /dashboard.
