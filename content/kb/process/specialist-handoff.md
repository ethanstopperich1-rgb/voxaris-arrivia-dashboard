# Specialist Handoff

## What a specialist handles
- Pricing and tier details (Select Access enrollment, point allocations, earnings)
- Account-specific lookups (balance, expiration dates, member ID)
- Bookings, cancellations, and refund eligibility
- Eligibility verification
- Anything legal, financial, or compliance-sensitive

## Warm transfer flow
1. Agent persists a transfer context to Supabase (caller phone, conversation summary, evidence ledger).
2. Agent fires SMS screen-pop to the specialist with the screen-pop URL.
3. Agent calls Retell `transfer_call` with whisper text and three-way bridge message.
4. Specialist answers, hears whisper, and is bridged to the caller.

## Specialist tools
- Screen-pop page at `/transfer/[contextId]` with full context, qualifying data, and evidence ledger.
- SMS link to the same URL.
