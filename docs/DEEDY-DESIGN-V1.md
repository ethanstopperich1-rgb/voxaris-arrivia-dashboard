# Deedy — Voxaris VBA Voice Agent Design v1

> Source-of-truth: Arrivia VBA Executive Brief (2026-05-01) + OPC Qualification Guide + TOP 100 OBJECTIONS + VBA Pitch Deck.
> Replaces: "Andie OPC v2" (the agent currently bound to `+14078538108`).
> Status: **DESIGN DOC — needs user sign-off on 10 open questions before we build.**

---

## TL;DR — what changes vs the live OPC agent

| Layer | Andie OPC v2 (live) | Deedy (per Arrivia spec) | Severity |
|---|---|---|---|
| Name | Andie | **Deedy** | trivial |
| Architecture | Direct: QR → `tel:` 302 → call | **Landing page → 18+ gate → TCPA consent → ad → call** | 🔴 **rebuild** |
| Income threshold | $75,000 | **$50,000** (per source) | 🔴 wrong fact in `opc-facts.json` |
| Age range | 25–70 | **25+** (no upper bound in source) | 🟡 maybe Westgate-specific? |
| Residency rule | "US or Canada" | **"Cannot live within local marketing area"** (LOCAL exclusion, not country inclusion) | 🔴 wrong rule |
| Tour duration | 90 min | **90–120 min** | 🟡 minor |
| $75 deposit | Not handled | **REQUIRED** for off-property guests | 🔴 missing |
| Folio hold | Not handled | **REQUIRED** for on-property guests | 🔴 missing |
| Live vs AI | AI 24/7 | **Business hours → live call center, after hours → Deedy** | 🔴 missing routing |
| Model A (autodial) vs B (tap-to-call) | B only | **Both as A/B test** | 🟡 build B first |
| Objections covered | 10 cards | **100 in 6 categories** + 7 trial-close families | 🟡 expand |
| PCI capture | Hard prohibition | **CONFLICT** — spec says deposit-capture for off-property | 🔴 needs decision |
| Premium incentive | Hardcoded "Disney 2-day park hopper" | **Partner-configurable per QR placement** | 🟡 already a var |

---

## Source-anchored qualification criteria (the one true list)

Per the OPC Qualification Guide + VBA Brief:

| Criterion | Standard | Notes |
|---|---|---|
| **Age** | 25+ | Must be legally able to enter into a contract |
| **Income** | Combined household $50,000+ | Discretionary income for travel/financing |
| **Decision makers** | Both must attend if married or cohabitating | All financial decision-makers present |
| **Credit** | Valid major credit card (NOT prepaid) | No active bankruptcy |
| **Employment** | Employed / self-employed / retired with income | NEW — wasn't in our flow |
| **Tour history** | No timeshare tour in last 6–12 months | No open promotional packages |
| **Residency** | Cannot live within the resort's local marketing area | LOCAL exclusion zone, not a country list |
| **Language** | Must understand presentation language (typically English) | Verify on call |
| **Attendance** | 90–120 minute presentation, both decision-makers in person | |
| **Deposit** | $75 — folio charge if on-property, credit card if off-property | Refunded on attendance |

---

## Architectural pivot — the front-end gate

The current `/scan/[id]` route is **out of compliance with the Arrivia spec.** It does a direct `302 → tel:` redirect, which:

1. Captures device data (phone scan, IP, user-agent) **before** age confirmation
2. Triggers the call **before** TCPA consent
3. Skips the COPPA shield entirely (no 18+ gate = under-13 data exposure)

The spec is explicit: **scan → landing page → 18+ checkbox → TCPA consent checkbox → ad plays → THEN call.**

### New flow (proposed)

```
QR scan  →  /vba/[placement_id]  (landing page, NO data captured)
              ↓
            [18+ confirm checkbox]
            [TCPA consent checkbox]
              ↓ (only after both checked)
            ad plays + data capture (phone number, name)
              ↓
            Model A: auto-dial guest (Deedy answers their phone)
            Model B: tap-to-call button (guest dials Deedy)
              ↓
            Business hours → human call center
            After hours    → Deedy
              ↓
            Qualification (8 criteria)
              ↓
            Trial close (slot choice)
              ↓
            $75 deposit:
              on-property: book folio hold via partner integration
              off-property: SMS Stripe link (PCI scope OUT of voice)
              ↓
            Booking confirmed → welcome team notified
```

---

## What Deedy should keep from Andie (don't throw the baby out)

The compliance kernel we already built ports cleanly:
- ✅ Verifier (`lib/opc/opc-verifier.ts`) — broaden to verify deposit-link sent
- ✅ Forbidden-claim detector (`lib/opc/opc-forbidden-detector.ts`) — keep all PCI heuristics
- ✅ Welcome-team handoff (`lib/opc/welcome-team-notify.ts`) — same pattern
- ✅ `opc_consent_log` immutable trail — central to the TCPA shield
- ✅ Conversation Flow Agent shape — fits the deterministic qualify-and-book task
- ✅ The 10 cards we built map to ~50 of the 100 in the source — extend, don't rewrite

---

## Objection coverage map (ours vs source's 100)

The source has **100 objections in 6 categories + 7 trial-close families.** We built 10 generic cards. Mapping:

| Source category | Count | Our coverage | Need to add |
|---|---|---|---|
| 1. Time / Commitment | 15 | 1 (`how_long_is_the_tour`) | 14 |
| 2. Sales Resistance | 20 | 3 (`do_i_have_to_buy`, `is_this_a_timeshare`, `not_interested`) | 17 |
| 3. Spouse / Decision Makers | 15 | 0 | 15 — biggest gap |
| 4. Travel / Situational | 15 | 0 | 15 |
| 5. Financial / Qualification | 15 | 2 (`why_income`, `is_this_credit_check`) | 13 |
| 6. General Resistance / Brush-offs | 20 | 1 (`not_interested`) | 19 |
| **Trial closes** | 7 families × ~3 each | 0 | **22 close lines — critical for conversion** |

**Recommendation:** keep the 10 cards as the safety/compliance backbone, but write 22 **trial-close snippets** as a separate file (not full cards — just response strings keyed by trigger). Trial closes are where conversion happens.

---

## OPEN QUESTIONS — need your call before I build

These are genuine forks. I will not guess on any of them.

### Compliance forks

**Q1. Front-end gate: build it now or skip for ARDA?**
- (a) Build the `/vba/[placement_id]` landing page with checkboxes — spec-compliant, ~4 hours, but means rebuilding scan flow before May 13
- (b) Skip for ARDA, ship Andie-style direct `tel:` for the demo only, document the gate as Phase 2
- (c) Build the gate but only enable it on a feature flag — demo can run either path

**Q2. The $75 deposit — how does Deedy handle it?**
- The spec says she captures it for off-property guests. Our PCI hardening forbids her from touching card data. Three options:
  - (a) **SMS Stripe link** post-qualification — Deedy says "I just sent you a secure link to hold your $75 deposit, refunded when you show up." Voice channel stays PCI-out-of-scope. **My recommendation.**
  - (b) **Twilio `<Pay>`** during the call — DTMF capture into Twilio's PCI-DSS-compliant relay. Deedy never hears the digits, but legally we're closer to scope.
  - (c) **No deposit at booking** — book the slot, charge folio at check-in for on-property, accept higher no-show rate for off-property.

**Q3. Live call center routing — does it exist?**
- (a) Yes, route there during business hours, Deedy is after-hours only (per spec)
- (b) No live center yet for the pilot, Deedy is 24/7
- If (a) — what number / SIP destination + what hours?

**Q4. AI disclosure — verify FL state requirement.**
- We disclose "I am an AI" in the opener. FL hasn't passed an AI-disclosure-on-call statute as of the source date, but state landscape moves fast. Want me to verify before May 13? (Yes/no — if yes I'll generate a Perplexity prompt below.)

### Qualification facts forks

**Q5. Income threshold: $50K (source) or $75K (what we have)?** Pick one. Source says $50K — but Westgate may have a higher internal standard.

**Q6. Age range: 25+ open-ended (source) or 25–70 (what we have)?** Westgate-specific upper bound, or remove the cap?

**Q7. Local residency exclusion radius?** Spec says "cannot live within local marketing area." For Westgate Lakes, Orlando — is the exclusion 50mi / 75mi / 100mi from the resort, or "FL residents excluded"? Need a concrete rule for the qualifier.

**Q8. Premium incentive for Westgate pilot?** Confirm "two complimentary 2-day Disney park hopper tickets" is real and approved by Westgate, vs being a placeholder I copied. If real, I keep it. If placeholder, what's the actual offer?

### Pilot model forks

**Q9. Model A (auto-dial) vs Model B (tap-to-call) for ARDA demo?**
- (a) Model B only (lower TCPA risk, higher intent — current build path)
- (b) Both — Model B for ARDA demo, Model A built on a feature flag for Phase 2
- (c) Model A only (easier to demo "wow, the phone called you" but TCPA exposure)

**Q10. After-hours definition?** Westgate "business hours" = ? Resort welcome team hours, not Arrivia. Need this to know when Deedy answers vs the live center.

---

## What I'll do once you answer

Single PR, four parts:

1. **`content/facts/opc-facts.json` → `content/facts/deedy-facts.json`** — corrected per Q5–Q8 answers, deposit rule per Q2, 8th criterion (employment) added
2. **`content/answer-cards/deedy/`** — extend from 10 to ~40 cards (mostly trial-close families)
3. **Live flow patch** — rename, rewrite nodes per corrected facts, add `confirm_deposit_path` node, add `verify_employment` node, change `qualify_residency` to local-exclusion logic
4. **`/vba/[placement_id]` landing page** + `app/api/vba/consent/route.ts` (gate write) — only if Q1 answer = (a) or (c)

ETA after answers: ~6 hours. Phone number `+14078538108` stays bound to the same agent_id; only the flow content changes.

---

## Perplexity / Grok prompts for the questions you might want to research

### For Q4 (FL AI disclosure law) — Perplexity:
```
Research current Florida state law (as of May 2026) regarding mandatory AI
disclosure on outbound and inbound voice calls to consumers, specifically in
the context of timeshare and hospitality marketing. What statutes, FL DBPR
guidance, or recent case law require an AI voice agent to disclose its
non-human nature? Cite primary sources only — statute numbers, regulatory
guidance documents, or court rulings. Compare to California SB-1001 and
Colorado AI Act for context. Do not speculate; if there is no FL-specific
requirement, say so.
```

### For Q7 (local marketing area radius) — Grok:
```
For a major Orlando-area timeshare resort like Westgate Lakes Resort & Spa,
what is the standard "local marketing area" exclusion radius used to
disqualify local residents from OPC tour incentive offers? Cite ARDA
(American Resort Development Association) standards if available, or
publicly disclosed Wyndham / Hilton Grand Vacations / Marriott Vacations
exclusion zones. Distinguish between "residence-based exclusion" (zip code
or county) and "distance-from-resort exclusion" (miles). Provide source
links for each claim.
```

### For Q5 (income threshold) — Perplexity:
```
What is the standard household income qualification threshold for timeshare
OPC tour eligibility in 2026 for major Orlando-area resorts? Compare
publicly available qualification standards from Westgate Resorts, Hilton
Grand Vacations, Marriott Vacations Worldwide, and Wyndham Destinations.
Are thresholds typically $50K, $75K, or $100K combined household income?
Cite ARDA industry standards if available. Distinguish stated minimums
from actual underwriting practice.
```

### For Q9 (Model A TCPA exposure) — Perplexity:
```
Under current FCC TCPA guidance (as of May 2026), does a QR-code-initiated
landing page consent flow with a single "I consent to receive automated
calls" checkbox constitute valid prior express written consent for an
autodialer to call the user's mobile phone within 60 seconds of the
checkbox? Cite the FCC's 2024 / 2025 TCPA orders, the National Consumer
Law Center guidance, and any class action settlements that addressed
checkbox-to-autodial timing windows. Quote the relevant CFR sections.
```

### For Q2 (Twilio Pay vs SMS Stripe link PCI scope) — Grok:
```
For a voice AI agent that needs to capture a $75 refundable deposit during
a phone call, compare the PCI-DSS scope implications of:
(1) Twilio <Pay> verb (DTMF capture relayed by Twilio's PCI-validated
    service to a payment processor)
(2) Sending a Stripe Checkout link via SMS post-call for the user to
    complete on their phone
Which approach keeps the AI agent's voice and storage infrastructure out
of PCI scope entirely? What is the practical SAQ level (A vs A-EP vs D)
implication of each? Cite Twilio's PCI compliance whitepaper and Stripe's
PCI scope documentation.
```

---

## Don't proceed until I hear from you on Q1, Q2, Q5

Q1 (gate or no gate), Q2 (deposit path), and Q5 (income threshold) are the only ones that block me from starting. The other 7 I can default sensibly while you decide.

**Defaults I'd use if you say "go with your gut":**
- Q1 → (c) build the gate behind a feature flag
- Q2 → (a) SMS Stripe link
- Q3 → (b) Deedy 24/7 for pilot
- Q4 → yes, run Perplexity
- Q5 → $50K (trust the source)
- Q6 → 25+ open-ended (trust the source)
- Q7 → 75 miles from `28.4173, -81.4783` (Westgate Lakes coordinates)
- Q8 → keep the Disney offer as placeholder, rename to `{{premium_offer}}` everywhere
- Q9 → (a) Model B only for ARDA
- Q10 → 9am–9pm ET as Westgate welcome-team hours

Tell me "go with your gut" and I ship in 6 hours. Or answer any subset and I'll proceed.
