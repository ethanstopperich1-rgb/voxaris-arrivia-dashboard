# Voxaris × Arrivia — Full Project Context for AI Assistant

**Project:** Andie — AI Voice Fronter Agent for Government Vacation Rewards (GVR)
**Built by:** Voxaris (Ethan Stopperich)
**Client:** Arrivia (Chris Cole SVP Sales, Jay Bankhead VP Memberships, Russell Reese Director Rev Ops)
**Status:** Pre-pilot — sandbox build underway, 90-day pilot pending SOW
**Date of this summary:** May 5, 2026

---

## What this project is

Arrivia operates **Government Vacation Rewards (GVR)** — a private travel-rewards membership program sold to active military, retired military, federal civilian employees, and government contractors. It is NOT a government agency and is NOT endorsed by any branch of the U.S. military.

Arrivia runs an outbound call program where agents in the Philippines ("fronters") cold/warm call a large base of free GVR members who haven't upgraded to a paid membership. The fronter's job is narrow: get the person engaged, remind them of their benefits, do minimal travel discovery, and warm-transfer them to a U.S.-based closer ("senior account manager") who does the actual sale.

Voxaris is replacing the Philippines fronter function with **Andie**, an AI voice agent built on Retell + LiveKit. The pilot is GVR-only. If it works, it expands to iCruise, Smarter Getaways, and other Arrivia brands.

---

## Confirmed numbers (from April 30 discovery call with Chris, Jay, Russell)

| Metric | Confirmed value |
|---|---|
| Total fronter agents | 23 (14 active, 9 recently hired — some only 4 days in) |
| Revenue per fronter / month | ~$19,000 (full month, includes new hires) |
| Total fronter revenue / month | ~$400,000–$450,000 |
| Daily dials (HCI through LiveVox) | ~30,000 |
| Connect rate | ~10% (~3,000 connects/day) |
| Daily transfers to closer | 150–200 (177 Thu, 181 Fri confirmed) |
| Fronter work schedule | Monday–Friday, mirrors the U.S. sales team |
| Best contact hours | Nights and weekends |
| Lead cadence | 6 attempts per quarter, ~7 campaigns in rotation |
| Inbound call lift from outbound | ~50% of inbound call volume traces back to the outbound dialer footprint |
| Lead pool for pilot | Free membership base — cold/warm propensity (NOT the hot daily enrollments) |
| Pilot scope | GVR only; hot leads (same-day enrollments, recent bookers) stay with Jay's reps |

---

## How the fronter call works (Andie's flow)

The job is intentionally narrow. Based on what Jay described and the fronter transcripts Chris shared:

1. **Recording disclosure** — in the first 10–15 seconds, every call, no exceptions
2. **Credibility check** — reference the member's name, enrollment date, and email on file. Proves the call is legitimate and they actually signed up.
3. **Light travel discovery** — one or two questions about upcoming travel (where, when, who's coming)
4. **Warm transfer to a closer** — Andie bridges the call and passes a summary of what she learned. The closer gets that context the moment they pick up.

**What Andie does NOT do:**
- Quote any pricing (fronters never discuss price — confirmed)
- Walk through all four benefit pillars in detail (that's the closer's job)
- Send Microsoft Bookings links as a primary path (fallback only if transfer queue is full)
- Reference address, DOB, payment info, or any PII beyond name/email/enrollment date

---

## The four benefit pillars (what GVR sells)

Andie knows these exist but only mentions them briefly to create interest before transferring. All specifics go to the closer.

1. **Savings Credits** — promotional credits in the member's GVR account, applied at booking against eligible travel through the GVR portal. Not cash, not a gift card, not redeemable outside GVR.
2. **Reward Points** — GVR's loyalty currency. Earned when booking through GVR, redeemed on future bookings. Exact rates vary by tier — specialist confirms specifics. (Specific numbers like 5,000 / 75,000 / 5x earnings are FORBIDDEN on the fronter call — MLA/DoD compliance.)
3. **Quarterly Specials** — limited-time partner offers (cruise lines, resorts, packages) that refresh each quarter. Specialist has the current catalog.
4. **Great Getaways** — curated pre-bundled travel packages. Specialist walks through what's available for the member's timeframe.

---

## Compliance hard rules

These are non-negotiable and baked into every layer of the system:

- **Recording disclosure** must be stated within the first 15–20 seconds of every call
- **AI identity** must be disclosed if asked — Andie never claims to be human
- **Two-party consent states:** CA, WA, HI, FL — the recording disclosure satisfies this
- **Select Access pricing is TRANSFER-ONLY** — Andie never quotes $3,499, 5,000 points, 75,000 points, 5x earnings, APR, financing, or any Select Access numbers
- **No government/military endorsement** — forbidden to imply GVR is a government program, DoD-backed, or military-endorsed
- **DNC/litigator suppression** — hard gate before any dial
- **TCPA consent flag** — hard gate before any dial
- **MLA / DoD-1344.07** — governs what can be said to active-duty military members

**Current recording disclosure (Voxaris draft — needs Arrivia legal approval):**
> "Just so you know, this call may be recorded for quality and training purposes."

**Current AI disclosure (Voxaris draft — needs Arrivia legal approval):**
> "I'm Andie, the AI assistant for Government Vacation Rewards. If you'd like to speak with a person at any point, just say 'agent' or 'representative' and I'll connect you."

**⚠️ Neither of these has been approved by Arrivia legal yet. This is an open action item.**

---

## The technology stack

| Layer | Tool |
|---|---|
| Voice AI platform | Retell (custom LLM via WebSocket) |
| Real-time transport | LiveKit |
| LLM (primary) | Anthropic Claude (claude-sonnet-4-6) |
| Embeddings / rerank | OpenAI (embeddings) + Cohere (rerank) |
| Database | Supabase (Postgres) |
| Cache / state | Redis (short-term call state) |
| Telephony | Twilio + LiveVox (Arrivia's existing system) |
| Outbound campaign system | LiveVox (Arrivia-managed) |
| Dashboard | Next.js app deployed on Vercel |
| WebSocket server (production) | Render subdomain |
| Observability | Helicone |

**LiveVox** is Arrivia's telephony and CRM system. It holds the lead list, recordings, dispositions, and campaign management. The integration plan:
- **Day 1:** batch CSV export from LiveVox → Andie's queue
- **Week 2+:** real-time API (read for list, write for outcomes)

---

## Lead data Andie uses per call

Pulled from LiveVox per record:

- First name, last name
- Phone number (E.164)
- Email on file
- Enrollment date
- Lead source / brand affinity (Champion Windows, military org, etc.)
- Brand (GVR vs. iCruise etc.)
- Member status (free / $8/mo / paid)
- Campaign / attempt number (1st vs. 5th attempt — different tone)
- Last disposition (don't repeat what didn't work)
- State / area code (local presence number matching)
- Time zone (TCPA dial windows)
- TCPA consent flag + date (hard gate)
- DNC / litigator flag (hard suppression)
- Booking history (hook: "I see you traveled with us last spring")

**NOT used:** address, DOB, payment info, Social, full government ID — nothing that would make an outbound call feel invasive.

---

## What Andie writes back after every call

Pushed back to LiveVox after each call:

- Outcome (transferred / declined / voicemail / no-answer / callback-requested / dnc-requested / wrong-number / not-eligible)
- Transfer success (boolean)
- Closer transferred to
- What member confirmed (name, email match, travel intent)
- Objections raised (structured list)
- Call duration (fronter leg only)
- Recording disclosure confirmed (boolean — compliance audit trail)
- Transcript link
- Recording link
- Callback requested (boolean + requested time)

---

## Caller ID / telephony context

- Arrivia is currently evaluating **branded caller ID** (~$1k/month for branded LCIDs) — pilot this month
- They rotate **local presence numbers** (602, 480, 407, etc.) to match the caller's area code
- Connect rates have declined significantly this year due to iOS call screening
- STIR/SHAKEN attestation level is being evaluated
- Andie is expected to help bypass iOS screening because she sounds like a natural voice (not a DTMF-based autodialer)

---

## Common objections Andie handles

From the discovery call and fronter transcript review:

| Objection | Category |
|---|---|
| "Are you a robot? Is this AI?" | AI detection |
| "I don't remember signing up for this" | Don't recall enrollment |
| "My spouse / partner handles this" | Spouse / partner |
| "I don't have time right now" | Time concern |
| "This sounds like a timeshare pitch" | Sales pressure |
| "How did you get my number? Is this a scam?" | Trust / verification |
| "I'm not interested in anything military-related" | Gov / military doubt |
| "I can't afford anything right now" | Cost concern |
| "I've already attended a presentation" | Already attended |
| "Can you just send me an email?" | Channel preference |
| "Let me think about it / talk to someone" | Wants to think |

---

## Dashboard

Live at the pilot URL. Login: **arrivia / demo2026** (temporary — proper credentials being set up).

**Andie's dashboard shows:**
- Live call counter (in-flight calls right now)
- KPI cards: Transfers + Links — today / this week / MTD with delta vs. prior period
- Conversion funnel (last 30 days): Calls answered → Engaged past intro → Warm hand-offs → Transferred to closer → Scheduler links sent
- 30-day trend sparkline
- Recent hand-offs (last 7 days)
- Top objections (auto-categorized from transcripts)

**Outbound dial form** — enter name + phone number, optionally override dynamic variables, click dial. Andie calls out immediately.

**Queue page** — drop a CSV, AI scores the leads, prioritized call order generated.

---

## What's still needed from Arrivia (open items)

**Critical:**
- 1,000 successful fronter transcripts (Jay Bankhead)
- 1,000 unsuccessful fronter transcripts (Jay Bankhead)
- LiveVox API credentials or sandbox access (Russell Reese)
- **Verbatim approved recording disclosure language (Arrivia legal)** — we have a draft, not yet approved
- Lead field mapping from LiveVox (Russell Reese)
- Voice selection — team needs to call the test line and pick (Jay Bankhead)
- Closer transfer endpoint (SIP / PSTN / LiveVox internal) (Jay Bankhead)

**Important:**
- Forbidden phrases / claims list (Jay + legal)
- Pricing model preference — per-transfer, per-dial, or monthly platform fee (Chris Cole)
- Cadence / segmentation campaign list (Russell Reese)

---

## Pilot terms (working draft)

- **Duration:** 90 days
- **Success anchor:** match or beat Philippines baseline on connect-completion rate and transfer rate, at lower cost per transfer
- **Exit:** either party can terminate at 30, 60, or 90 days with 7 days written notice, remainder pro-rated
- **Pricing model:** TBD — three options under discussion (per-transfer / per-dial-completed / monthly platform + usage)
- **Phase 2 pipeline** (post-pilot if GVR works): iCruise, Smarter Getaways, website overlay virtual agent, $8.99/mo perpetual close flow

---

## Key people

| Person | Role | Responsibility |
|---|---|---|
| Ethan Stopperich | Voxaris — builder | Andie build, dashboard, pilot SOW |
| Stacy | Voxaris — account | Executive alignment, client relationship |
| Chris Cole | Arrivia — SVP Sales | Economic buyer, KPI sign-off, contract |
| Jay Bankhead | Arrivia — VP Memberships | Champion, transcripts, script tuning, voice selection |
| Russell Reese | Arrivia — Director Rev Ops | LiveVox integration, telephony, list segmentation |
| TBD | Arrivia legal | TCPA compliance, disclosure language, DNC |

---

## What to keep in mind if you're helping with this

- **Never hardcode dollar / point / percent / date values** — all numbers flow through `facts.json` with dynamic variables
- **Select Access pricing is forbidden** on the fronter call — $3,499, 5,000 points, 75,000 points, 5x earnings, APR, financing are all hard no's
- **Andie's job is narrow** — disclosure, credibility, light discovery, warm transfer. That's it. The closer does everything else.
- **LiveVox is the system of record** — all lead data in, all dispositions out
- **50% of Arrivia's inbound call volume already comes from the outbound dialer footprint** — voicemails and hang-ups are still generating callbacks, so Andie's ROI isn't just the transfers
- **This is military/gov demographic** — no foreign-sounding voices, no implicit government endorsement, no MLA violations
- The approved recording disclosure language **has not been confirmed by Arrivia legal yet** — the current language in the system is a Voxaris draft
