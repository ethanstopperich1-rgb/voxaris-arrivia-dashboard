# STIR/SHAKEN + Twilio BYOC Migration Plan

**Why:** AI-dialed outbound calls get aggressively spam-flagged at scale unless the
caller ID is registered, attested, and branded. Per the Retell deep-dive, this is
the **highest-likelihood risk** for the GVR pilot's outbound reactivation use case.

**When:** Days 4–6 of the 12-day roadmap (May 5–7), before any real outbound to
Arrivia members. Not blocking the pre-recorded ARDA demo since that's a single
known recipient.

---

## Step 1 — Twilio account setup (if not already)

- [ ] Create Twilio account (or use Voxaris's existing one).
- [ ] Verify Twilio Trust Hub registration:
  - Business Profile (Voxaris LLC info)
  - Customer Profile (linked to GVR / Arrivia for the specific use case)
- [ ] Confirm SOC 2 + privacy policy URLs on the Trust Hub profile.

## Step 2 — Buy / port the GVR DID into Twilio

**Option A — Buy a fresh Twilio number** (fast, ~5 min)
```bash
twilio phone-numbers:buy:local --country-code US --area-code 407
```
Use the same area code (407 = Orlando, matching `+14072890294`) so the number doesn't visually shift.

**Option B — Port `+14072890294` from Retell to Twilio** (slow, 5–10 business days)
- Submits a Letter of Authorization (LOA).
- Use only if Stacey wants to keep the exact number.
- Recommendation: skip the port for the pilot. Buy a new number.

## Step 3 — Bring Your Own Carrier (BYOC) into Retell

Retell supports Twilio BYOC via SIP trunking. Setup:

```bash
# 1. Create a SIP trunk in Twilio
twilio elastic-sip-trunking:trunks:create --friendly-name "GVR-Voxaris-BYOC"

# 2. Add origination + termination URIs (Retell provides these)
#    Get them from Retell dashboard: Phone Numbers → Add → BYOC
twilio elastic-sip-trunking:trunks:origination-urls:create \
  --trunk-sid TKxxxx \
  --sip-url sip:<retell-given-url>;edge=ashburn \
  --weight 10 --priority 10

# 3. Assign the bought number to the trunk
twilio elastic-sip-trunking:phone-numbers:create --trunk-sid TKxxxx --phone-number-sid PNxxxx

# 4. In Retell dashboard:
#    Phone Numbers → Add Phone Number → BYOC (Twilio)
#    Paste the Twilio number + auth credentials
#    Bind to outbound agent agent_6a6703e0893d0a01c49a4d8636
```

Cost win: $0.013–0.014/min vs Retell-provided $0.015–0.020/min. ~$0.005/min savings.
At 120k min/mo: ~$600/mo savings.

## Step 4 — STIR/SHAKEN A attestation

A attestation (highest tier) requires the carrier (Twilio) to verify:
1. Voxaris is the originator of the call.
2. Voxaris has the right to use the calling number.
3. Voxaris has direct authenticated relationship with the called party (GVR member opted in).

**Steps:**
- [ ] In Twilio Console → Voice → SIP Trunking → Trust Hub → Submit STIR/SHAKEN profile
- [ ] Attestation Level: **A** (full attestation)
- [ ] Provide proof of consent: GVR's existing TCPA-compliant member sign-up flow
- [ ] Approval timeline: 24–72 hours
- [ ] Verify attestation is firing on outbound calls via call SIP headers (`Identity` header should appear in PCAPs)

## Step 5 — Branded Caller ID Display

Twilio Branded Calling shows "Government Vacation Rewards" instead of an unknown number on the recipient's screen.

- [ ] Apply at https://www.twilio.com/branded-calling
- [ ] Provide:
  - GVR brand name (subject to Arrivia approval)
  - Logo (PNG, square, ≥500px)
  - Optional reason for call ("Travel benefits update")
- [ ] Cost: typically $0.005–0.01/branded call (verify current pricing)
- [ ] Approval timeline: 5–10 business days
- [ ] Carrier coverage: ~85% of US wireless subscribers as of mid-2025

## Step 6 — Outbound pacing rules (first 30 days)

To build carrier reputation, stay under volume thresholds for the first 30 days
of outbound dialing:

| Metric | Limit (week 1) | Limit (week 2) | Limit (week 3+) |
|---|---|---|---|
| Calls per minute (per number) | ≤2 | ≤5 | ≤10 |
| Calls per day (per number) | ≤300 | ≤800 | ≤2000 |
| Calls per recipient per day | 1 | 1 | 1 |
| Calls per recipient per week | 2 | 2 | 3 |
| Hold time before hangup | 30s | 30s | 30s |

Wire these into our `/api/outbound/start-batch` route's `pace_ms` parameter and
the rate limiter on the outbound queue.

## Step 7 — Monitor flagging in production

- [ ] Set up FreeCallerID lookup checks weekly (free tier)
- [ ] Subscribe to Hiya / Truecaller spam-status reports for the DID
- [ ] If "Spam Likely" appears, immediately pause outbound from that number, rotate to a backup DID
- [ ] Always keep one warm-aged DID in the pool (avoid rotating to a freshly-bought number)

## Cost summary

| Item | One-time | Monthly |
|---|---|---|
| Twilio number | $0 | $1.15 |
| Twilio BYOC SIP trunking | $0 | $0.013–0.014/min × usage |
| STIR/SHAKEN A attestation | $0 | included with Twilio |
| Branded Calling | $0–500 setup | $0.005–0.01/branded call |
| Trust Hub registration | $0 | $0 |

For 120k AI min/mo:
- Twilio BYOC: ~$1,560–1,680/mo (vs ~$1,800–2,400 on Retell DID — saves $300–700/mo)
- Branded Calling: ~$600/mo (at $0.005/call × 120k calls — but reduces spam-flag rate, increases connect rate, ROI positive)

---

## Open questions to confirm before executing

1. **Voxaris LLC formed?** Trust Hub requires legal entity.
2. **Voxaris's tax ID + DUNS number** for STIR/SHAKEN?
3. **Brand name for branded calling** — "Government Vacation Rewards" needs Arrivia's written authorization; "Voxaris" is fine independently but won't help member reactivation.
4. **Existing Arrivia carrier contracts** — do they already have BYOC trunks we can ride for production scale-up?

Get answers from Stacey + Voxaris ops before May 5.
