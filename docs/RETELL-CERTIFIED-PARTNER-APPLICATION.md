# Retell Certified Partner Program — Voxaris Application Draft

**Purpose:** Pre-fill the Retell Implementation Partner application before submitting at https://retellai.com/partners (after GVR goes live).
**Status:** DRAFT — submit after one live production customer (GVR pilot completion qualifies).

---

## Company Information

- **Company name:** Voxaris
- **Website:** voxaris.io
- **Founded:** 2026
- **Location:** Florida, USA
- **Founder:** Ethan Stopperich
- **Stage:** Boutique implementation studio specializing in compliance-first voice AI

## Voice AI Capability Demonstration

### Production deployments
- **Government Vacation Rewards (Arrivia)** — May 2026
  - 24/7 inbound + outbound voice agent for ~$1.5B revenue travel-loyalty company
  - Two-agent architecture (Andie INBOUND + Andie OUTBOUND) on Retell Conversation Flow
  - Compliance posture: TCPA, MLA, DoD-1344.07, two-party consent disclosure
  - Zero-hallucination guardrails: pricing-fact validator + dynamic-variable system
  - Warm transfer with carrot scripting + Microsoft Bookings scheduler-link integration
  - Cross-call memory via inbound webhook + Supabase
  - Pre-recorded demo presented at ARDA conference, May 13, 2026

### Additional implementations
- **TKBSO (kitchen & bath remodeling, Orlando)** — production (separate brand)
- **Pinol Law** — early production
- **Other automotive dealership pilots** — talking-postcard agents

## Technical Capabilities

We've shipped Retell builds spanning:
- Single-prompt agents
- Multi-prompt (state) agents
- Conversation Flow (visual graph)
- Custom LLM via WebSocket — Phase 2 architecture for cost-optimized clients
- Knowledge base / RAG integration
- Custom function tools (Twilio SMS, Resend email, Microsoft Bookings, Supabase, custom CRMs)
- MCP server integration for typed CRM access
- Warm + cold transfer patterns with private whisper briefings
- Voicemail detection + structured voicemail messages
- Post-call analysis with custom structured fields
- PII redaction at the transcript level

## Why Voxaris fits the Implementation Partner tier

1. **Compliance-first methodology.** We refuse to ship voice agents that quote unapproved numbers. Our pricing-fact validator + verification-pass architecture is reusable across regulated industries (travel-loyalty, legal, healthcare, financial services).
2. **Speed-to-pilot.** We shipped GVR's full inbound + outbound flow including Conversation Flow migration, two agents, voice cloning, webhook wiring, and a working dialer in 14 days.
3. **Architecture portability.** Our prompts, flows, and analytics schema are vendor-portable; we don't lock clients into Retell-specific paradigms.
4. **Co-marketing potential.** GVR's parent company Arrivia is a $1.5B operator in travel loyalty (Mike Nelson, CEO). Conference visibility at ARDA, ASTA, and adjacent industry events.

## Partner ROI hypothesis

- **Voxaris pricing:** $60–80K pilot fee + $5–12K/mo managed retainer
- **Per-minute economics:** Retell base ~$0.07/min × 120k min/mo per typical pilot = ~$8.4k/mo to Retell
- **Partner rev share at Implementation tier:** estimated 10–15% on every minute of every Voxaris client deployment
- **Scaling assumption:** 5 production clients within 12 months, ~50k–100k min/mo each. Target rev share to Voxaris: $5k–10k/mo passive revenue stream

## Application checklist

- [ ] One live production customer (GVR pilot completion = qualifying event)
- [ ] Demonstrated voice-AI capability (the GVR demo recording is sufficient evidence)
- [ ] Voxaris company entity formed
- [ ] Voxaris has a public website (voxaris.io) describing the practice
- [ ] At least one technical writeup or case study published (consider: GVR architecture post-mortem after ARDA)
- [ ] Identified 2–3 named upcoming pipeline opportunities to validate continued production work

## Submission timing

**Earliest:** Immediately after Stacey presents at ARDA on May 13, 2026 (qualifies as "demonstrated voice-AI capability" + "one live production customer").
**Recommended:** May 20, 2026 — after the post-ARDA SOW conversation lands, so the application can name GVR as a paying client, not just a pilot.

## Application URL

https://retellai.com/partners (or contact `partners@retellai.com` for direct intro — having a Retell AE warm-intro the application is faster than the form).

---

**Draft owner:** Ethan Stopperich, Voxaris
**Draft date:** May 1, 2026
