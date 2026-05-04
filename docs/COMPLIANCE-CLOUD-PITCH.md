# Voxaris Compliance Cloud — The OPC Pitch Reframe

> Source: multi-model legal council (GPT-5.5 + Claude Opus 4.7 + Gemini 3.1), Apr 2026.
> Council insight #3 — "Package a paid Compliance Cloud layer."
>
> The voice agent is the wedge. **Compliance is the product.**

---

## The shift

**Old framing (labor replacement):**
> "We replace OPC reps with AI voice. $125 per showed tour."

This loses on three fronts:
1. Buyers benchmark against rep cost ($/tour) and negotiate margin to zero.
2. It positions us as a vendor competing with Ganesh-style AI-OPC startups.
3. It puts ALL the regulatory risk on us with none of the upside.

**New framing (regulatory shield):**
> "We are the compliance layer for guest-initiated voice in timeshare.
> Every scan, every consent, every disclosure — captured, immutable, audit-ready.
> The booking is a side-effect. **The audit trail is the product.**"

---

## Why this wins

### 1. TCPA + FL Statute 721 risk is unbounded for the resort
- TCPA statutory damages: $500–$1,500 per violation, **per call**
- Florida Chapter 721 disclosures must be timestamped and reproducible
- A single class action erases years of OPC margin
- Resorts will pay $X/month forever to make this risk go away — they won't pay $125 forever for a tour

### 2. Compliance is a moat Ganesh can't cross in 90 days
- Ganesh-style competitors ship a voice agent in a weekend
- They cannot ship: immutable consent log + scan attribution + PII redaction + auditor-ready exports + DNC enforcement + SOC2 trajectory
- Every audit, every state expansion, every cruise/hospitality vertical = **same compliance kernel**

### 3. Arrivia distribution loves recurring revenue
- $125/tour is transactional — it competes with their margin
- $/property/month subscription is additive — it's a line item Arrivia can resell across their book

---

## The product layers (what we actually charge for)

| Layer | What it is | Who pays | Pricing model |
|---|---|---|---|
| **Voice Agent** | Andie answering scans | Resort | $125/showed tour (commodity wedge) |
| **Compliance Cloud** | Consent log, scan attribution, PII redaction, DNC enforcement, audit exports | Resort GC + Arrivia legal | **$2,500–$10,000/property/month flat** |
| **Insurance Wrap** | Indemnification rider tied to Compliance Cloud usage | Resort risk officer | Pass-through + 20% margin |
| **Regulator Portal** | Read-only auditor view (FL DBPR, FTC, state AGs) | — | Bundled, but it's the moat |

---

## What's already shipped (proof we are not vaporware)

- `opc_consent_log` table — append-only, immutable, every SMS dispatch traces to a row
- `opc_scans` table — every QR scan logged server-side, even if call never completes
- `/scan/[id]` route — redundant attribution layer (DTMF unreliable per council)
- `opc_book` endpoint — gated on `sms_consent_captured: true`, suppresses SMS on no-consent
- Live flow `confirm_phone_for_sms` node — captures explicit yes/no consent
- Live flow global prompt — hard prohibition on PCI data capture (PAN/CVV/SSN/DOB)
- Live flow `qualify_credit` node — yes/no only, refuses card numbers, interrupt pattern wired

**This stack already produces audit-grade artifacts.** We are not building Compliance Cloud — we are *naming* what already exists.

---

## What still needs to ship for "Compliance Cloud" to be sellable

1. **Auditor export endpoint** — `/api/compliance/export?property_id=X&from=…&to=…` returns a signed ZIP of all consents + scans + booking outcomes for a date range
2. **Dashboard view** — `/dashboard/compliance` showing: consent capture rate, DNC adds, scan-to-call funnel, PCI-block events
3. **DNC enforcement at flow level** — outbound prefilter check against `opc_dnc` before any call attempt
4. **Recording retention policy doc** — written, signed, referenceable in resort MSA
5. **SOC 2 Type 1 readiness gap analysis** — not the cert, just the gap doc, so we can say "on the SOC2 trajectory"

ETA on all 5: ~5 working days. Doable before ARDA (May 13).

---

## ARDA pitch — 60 seconds

> "Westgate has 164,000 stays a year. Today, every guest interaction with an OPC rep is a TCPA exposure with no reproducible audit trail. One bad recording, one missed disclosure, one disputed consent — and the legal exposure dwarfs the OPC margin.
>
> Voxaris is the compliance layer. The guest scans a QR code — that scan is logged server-side. They tap to call — Andie discloses she's an AI, captures explicit consent for SMS, refuses any payment data, and the entire interaction is reproducible in an auditor-ready export.
>
> The booking is a nice-to-have. **What you're buying is a regulatory shield that scales with you across properties, states, and verticals.**
>
> Voice agent is $125 per showed tour — that's the wedge. Compliance Cloud is $2,500 per property per month — that's the product. We pilot at Lakes, we ship the audit export by ARDA, and we expand to your portfolio of 16 properties through Arrivia distribution."

---

## What NOT to say

- ❌ "We replace OPC reps" → triggers labor-cost benchmarking
- ❌ "We're cheaper than humans" → race to the bottom
- ❌ "AI-powered OPC" → puts us in Ganesh's category
- ❌ Anything that implies we *eliminate* legal risk → we *contain and document* it

## What TO say

- ✅ "Compliance layer for guest-initiated voice"
- ✅ "Audit-ready by default"
- ✅ "Every consent immutable, every scan attributable, every disclosure timestamped"
- ✅ "Regulatory shield that scales across properties"
