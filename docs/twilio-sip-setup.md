# Twilio SIP Setup

## Steps
1. Buy a US local DID in Twilio Console → Phone Numbers → Buy a number.
2. Create an Elastic SIP Trunk (Console → Elastic SIP Trunking → Trunks → New).
3. Set the Termination SIP URI (e.g. `gvr-demo.pstn.twilio.com`).
4. Add Origination URI pointing at Retell (your Retell account → Phone numbers → SIP termination URI).
5. Authentication: IP ACL or username/password — we use credentials in `.env` (`TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`).
6. Run `pnpm import:twilio-number` to bind the DID to the Retell agent.
7. Verify inbound: dial the DID — agent should answer with the Module 0 opener within 1.5s.

## Troubleshooting
- No audio? Check Termination URI and that Twilio Trunk → Origination → Trunk Status is "active".
- Greeting clipped? Increase `begin_message_delay_ms` in `agent.json`.
- One-way audio? Check codec settings — we use PCMU (G.711μ-law) by default.

## SMS screen-pop
Same Twilio account sends SMS from `TWILIO_FROM_NUMBER` to `SPECIALIST_SMS_NUMBER`. Confirm both are SMS-enabled (Twilio Console → Phone Numbers → Manage → Active Numbers).
