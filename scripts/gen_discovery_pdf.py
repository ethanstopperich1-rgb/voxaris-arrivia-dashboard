#!/usr/bin/env python3
"""Voxaris x Arrivia -- GVR Call Summary & Next Steps PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.platypus.flowables import Flowable
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import os

# Palette
BLACK        = HexColor("#0a0a0a")
WHITE        = HexColor("#ffffff")
SILVER_LIGHT = HexColor("#e2e8f0")
SILVER       = HexColor("#cbd5e1")
SILVER_DARK  = HexColor("#94a3b8")
SLATE        = HexColor("#1e293b")
RULE_COLOR   = HexColor("#334155")
TABLE_HEAD   = HexColor("#1e293b")
TABLE_ALT    = HexColor("#f8fafc")
TABLE_BORDER = HexColor("#e2e8f0")
SUBTLE       = HexColor("#64748b")
WARM_BG      = HexColor("#f8fafc")

W, H = letter
MARGIN  = 0.85 * inch
INNER_W = W - 2 * MARGIN

OUTPUT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "../public/discovery-doc-voxaris-arrivia.pdf"
)


def _draw_cover(c):
    c.saveState()
    c.setFillColor(BLACK)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Wordmark
    c.setFont("Helvetica-Bold", 48)
    c.setFillColor(SILVER_LIGHT)
    c.drawCentredString(W / 2, H - 2.7 * inch, "VOXARIS AI")
    c.setFont("Helvetica", 13)
    c.setFillColor(SILVER_DARK)
    c.drawCentredString(W / 2, H - 3.1 * inch, "Personalizing Your Outreach")

    # Divider
    c.setStrokeColor(HexColor("#334155"))
    c.setLineWidth(0.5)
    c.line(1.5 * inch, H - 3.45 * inch, W - 1.5 * inch, H - 3.45 * inch)

    # Doc title
    c.setFont("Helvetica-Bold", 17)
    c.setFillColor(WHITE)
    c.drawCentredString(W / 2, H - 4.1 * inch, "GVR Pilot -- Call Summary & Next Steps")

    c.setFont("Helvetica", 11)
    c.setFillColor(SILVER)
    c.drawCentredString(W / 2, H - 4.5 * inch, "Government Vacation Rewards  |  Voxaris x Arrivia")

    # Meta block
    meta = [
        ("Date",          "May 6, 2026"),
        ("From",          "Ethan Stopperich, Voxaris"),
        ("To",            "Chris Cole, Jay Bankhead, Russell Reese, Stacey Sutherland -- Arrivia"),
        ("Re",            "Andie -- AI Fronter Agent, GVR Pilot"),
    ]
    y = H - 5.4 * inch
    for label, value in meta:
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(SILVER_DARK)
        c.drawString(1.8 * inch, y, label.upper())
        c.setFont("Helvetica", 9)
        c.setFillColor(SILVER_LIGHT)
        c.drawString(3.1 * inch, y, value)
        y -= 0.27 * inch

    # Footer note
    c.setFont("Helvetica-Oblique", 8)
    c.setFillColor(SILVER_DARK)
    c.drawCentredString(W / 2, 1.2 * inch,
                        "Based on our April 30 discovery call. Numbers confirmed by team -- please flag anything off.")
    c.setStrokeColor(HexColor("#334155"))
    c.setLineWidth(0.4)
    c.line(1.5 * inch, 1.45 * inch, W - 1.5 * inch, 1.45 * inch)

    c.restoreState()


class PageDeco:
    def __call__(self, c, doc):
        c.saveState()
        if doc.page == 1:
            _draw_cover(c)
            c.restoreState()
            return
        # Header — text first, rule below both lines
        c.setFont("Helvetica-Bold", 7.5)
        c.setFillColor(BLACK)
        c.drawString(MARGIN, H - 0.34 * inch, "VOXARIS AI")
        c.setFont("Helvetica", 7)
        c.setFillColor(SILVER_DARK)
        c.drawString(MARGIN, H - 0.47 * inch, "Personalizing Your Outreach")
        c.setFont("Helvetica", 7)
        c.setFillColor(SILVER_DARK)
        c.drawRightString(W - MARGIN, H - 0.34 * inch, "GVR Pilot -- Call Summary & Next Steps")
        c.drawRightString(W - MARGIN, H - 0.47 * inch, "Voxaris x Arrivia  |  May 5, 2026")
        c.setStrokeColor(RULE_COLOR)
        c.setLineWidth(0.4)
        c.line(MARGIN, H - 0.60 * inch, W - MARGIN, H - 0.60 * inch)
        # Footer
        c.line(MARGIN, 0.48 * inch, W - MARGIN, 0.48 * inch)
        c.setFont("Helvetica", 7)
        c.setFillColor(SILVER_DARK)
        c.drawCentredString(W / 2, 0.30 * inch, "%d" % doc.page)
        c.drawString(MARGIN, 0.30 * inch, "ethan@voxaris.io")
        c.drawRightString(W - MARGIN, 0.30 * inch, "voxaris.io")
        c.restoreState()


def make_styles():
    def ps(name, **kw):
        d = dict(fontName="Helvetica", fontSize=9.5,
                 textColor=BLACK, leading=14, spaceAfter=5)
        d.update(kw)
        return ParagraphStyle(name, **d)
    return {
        "section": ps("Section", fontName="Helvetica-Bold", fontSize=12,
                      textColor=SLATE, spaceBefore=22, spaceAfter=6, leading=16),
        "subsec":  ps("Subsec",  fontName="Helvetica-Bold", fontSize=10,
                      textColor=SLATE, spaceBefore=14, spaceAfter=4, leading=14),
        "body":    ps("Body",    leading=15, spaceAfter=7, textColor=BLACK),
        "note":    ps("Note",    fontName="Helvetica-Oblique", fontSize=8.5,
                      textColor=SUBTLE, spaceAfter=5, leading=13),
        "bul":     ps("Bul",     leftIndent=12, leading=14, spaceAfter=4),
        "th":      ps("TH",      fontName="Helvetica-Bold", fontSize=8,
                      textColor=WHITE, leading=11),
        "td":      ps("TD",      fontName="Helvetica", fontSize=8.5,
                      textColor=BLACK, leading=12),
        "tdg":     ps("TDg",     fontName="Helvetica", fontSize=8.5,
                      textColor=SUBTLE, leading=12),
    }


def sec(t, s):    return Paragraph(t, s["section"])
def sub(t, s):    return Paragraph(t, s["subsec"])
def body(t, s):   return Paragraph(t, s["body"])
def note(t, s):   return Paragraph(t, s["note"])
def bul(t, s):    return Paragraph("&bull;  " + t, s["bul"])
def sp(n=6):      return Spacer(1, n)
def hrule():      return HRFlowable(width="100%", thickness=0.4,
                                    color=TABLE_BORDER, spaceAfter=10, spaceBefore=2)


def mktable(headers, rows, widths, s, shade_col=None):
    hrow = [Paragraph("<b>%s</b>" % h, s["th"]) for h in headers]
    data = [hrow]
    for row in rows:
        data.append([
            Paragraph(str(c) if c else "", s["td"]) for c in row
        ])
    t = Table(data, colWidths=widths, repeatRows=1)
    style = [
        ("BACKGROUND",     (0, 0), (-1, 0),  TABLE_HEAD),
        ("TEXTCOLOR",      (0, 0), (-1, 0),  WHITE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, TABLE_ALT]),
        ("GRID",           (0, 0), (-1, -1), 0.35, TABLE_BORDER),
        ("VALIGN",         (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",     (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 5),
        ("LEFTPADDING",    (0, 0), (-1, -1), 7),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 7),
        ("LINEBELOW",      (0, 0), (-1, 0),  0.6, RULE_COLOR),
    ]
    t.setStyle(TableStyle(style))
    return t


def divider(label):
    data = [[label.upper()]]
    t = Table(data, colWidths=[INNER_W])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), TABLE_HEAD),
        ("TEXTCOLOR",     (0, 0), (-1, -1), SILVER_LIGHT),
        ("FONTNAME",      (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8.5),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
    ]))
    return t


def build():
    s = make_styles()
    story = []

    story.append(PageBreak())  # page 1 = cover via onFirstPage

    # ── INTRO ─────────────────────────────────────────────────────────────────
    story += [
        body("Hey Chris, Jay, Russell -- thanks again for the time on the call. "
             "Here's a quick summary of what we talked about, the numbers we confirmed, "
             "and a short list of what we need to get moving. Nothing complicated -- "
             "just want to make sure we're all working from the same page before we "
             "kick things off.", s),
        sp(16),
    ]

    # ── 1. WHAT WE'RE BUILDING ────────────────────────────────────────────────
    story += [
        divider("What we're building"),
        sp(10),
        body("<b>Andie</b> is a voice AI agent that handles the fronter role for GVR's "
             "cold and warm propensity base -- the same job your Philippines team does today, "
             "but consistent, scalable, and available whenever you want to dial.", s),
        sp(6),
        body("The job is intentionally narrow: confirm who the member is, "
             "remind them they have active benefits, get a read on their travel intent, "
             "and hand them to a closer with that context already loaded in. "
             "That's it. No pricing, no heavy qualification, no selling.", s),
        sp(6),
        body("Everything else -- the scripting, the cadencing, the segmentation -- "
             "we match to how Jay's best fronters already work. "
             "The goal for the pilot is to prove this out on GVR first, "
             "then roll it to iCruise, Smarter Getaways, and the rest of the brands.", s),
        sp(18),
    ]

    # ── 2. NUMBERS FROM THE CALL ──────────────────────────────────────────────
    story += [
        divider("Numbers we confirmed"),
        sp(10),
        mktable(
            ["Metric", "What you told us"],
            [
                ("Total fronter agents",         "23 total (14 active, 9 recently hired -- some only 4 days in)"),
                ("Revenue per fronter / month",  "~$19,000 (full month, includes new hires)"),
                ("Total fronter revenue / month","~$400,000-$450,000"),
                ("Daily dials (HCI through LiveVox)", "~30,000"),
                ("Connect rate",                 "~10% (~3,000 connects/day)"),
                ("Daily transfers to closer",    "150-200 (177 Thu, 181 Fri last week)"),
                ("Fronter work schedule",        "Monday-Friday, mirrors the sales team"),
                ("Best contact hours",           "Nights and weekends"),
                ("Lead cadence",                 "6 attempts per quarter, ~7 campaigns in rotation"),
                ("Inbound lift from outbound",   "50% of all inbound calls are people calling back after being touched by the outbound dialer -- voicemails, hang-ups, missed calls that generated a return. Example: if Arrivia receives 10,000 inbound calls in a week, ~5,000 of those originated from the outbound footprint."),
                ("Inbound callbacks / week (exact)", "TBD -- Russell to confirm the actual weekly inbound volume so we can size this properly."),
                ("Lead pool for this pilot",     "Free membership base -- cold/warm propensity, not the hot daily enrollments"),
            ],
            [2.3 * inch, 4.7 * inch], s),
        sp(8),
        note("The hot leads (same-day enrollments, recent bookers) stay with Jay's outbound sales reps -- "
             "those convert too well to mix into this program. We're focused on the large cold/warm base.", s),
        sp(18),
    ]

    # ── 3. HOW THE CALL WORKS ─────────────────────────────────────────────────
    story += [
        divider("How the call works"),
        sp(10),
        body("Based on the call and the fronter transcripts Chris shared, here's how we're "
             "building Andie's flow:", s),
        sp(8),
    ]

    steps = [
        ("Recording disclosure", "Within the first 10-15 seconds, every time, no exceptions."),
        ("Credibility check",    "Andie references the member's name, enrollment date, and email on file. "
                                 "Simple stuff that proves the call is legitimate and they actually signed up."),
        ("Light discovery",      "One or two questions about travel plans -- where they're thinking of going, "
                                 "when, who's coming. Nothing heavy."),
        ("Warm handoff",         "Andie transfers to a closer with a quick summary of what she learned. "
                                 "The closer gets that context the moment the call connects."),
    ]

    step_data = [[Paragraph("<b>%s</b>" % a, s["td"]), Paragraph(b, s["td"])]
                 for a, b in steps]
    flow_table = Table(step_data, colWidths=[1.6 * inch, 5.4 * inch])
    flow_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), WARM_BG),
        ("GRID",          (0, 0), (-1, -1), 0.35, TABLE_BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("FONTNAME",      (0, 0), (0, -1), "Helvetica-Bold"),
    ]))
    story.append(flow_table)
    story.append(sp(8))
    story.append(note("No pricing gets discussed on the fronter call -- same as today. "
                      "That stays with the closer.", s))
    story.append(sp(18))

    # ── 4. LEAD DATA WE'D USE ─────────────────────────────────────────────────
    story += [
        divider("Lead data -- what we pull from LiveVox"),
        sp(10),
        body("These are the fields that actually matter for personalizing the outreach. "
             "All of this should already be in LiveVox. Russell, flag anything that's "
             "missing or named differently in your system.", s),
        sp(8),
        mktable(
            ["Field", "How Andie uses it"],
            [
                ("First name",               "Personalizes the opener"),
                ("Enrollment date",          "Credibility -- 'you signed up back in March of 2023'"),
                ("Email on file",            "Credibility -- confirms the call is legitimate"),
                ("Lead source / brand",      "GVR vs. other Arrivia brands; campaign routing"),
                ("Campaign / attempt number","Different tone for a 1st attempt vs. a 5th"),
                ("Last disposition",         "Avoids repeating whatever didn't work last time"),
                ("State / area code",        "Local presence number matching"),
                ("Time zone",               "Makes sure we're not calling outside TCPA windows"),
                ("TCPA consent flag",        "Hard gate -- no flag, no call"),
                ("DNC / litigator flag",     "Hard suppression"),
                ("Booking history",          "If they've actually traveled with GVR, that's a great opener"),
            ],
            [2.0 * inch, 5.0 * inch], s),
        sp(8),
        note("Per the call -- we're keeping it to what members already gave you at signup. "
             "No address, no DOB, no payment info, nothing that would make an outbound call "
             "feel creepy. Just enough to show we know who they are.", s),
        sp(18),
    ]

    # ── 5. WRITE-BACK ──────────────────────────────────────────────────────────
    story += [
        divider("What Andie sends back after every call"),
        sp(10),
        body("After each call wraps, we push a record back into LiveVox "
             "so the disposition, transcript, and discovery notes are all in the same "
             "place your team already works.", s),
        sp(8),
        mktable(
            ["Field", "What it contains"],
            [
                ("Outcome",                "transferred / declined / voicemail / no-answer / callback-requested / wrong-number"),
                ("Transfer success",       "did the warm handoff actually connect"),
                ("Closer transferred to",  "name or extension"),
                ("What member confirmed",  "name, email match, travel intent"),
                ("Objections raised",      "structured list for Jay's team to review"),
                ("Call duration",          "fronter leg only"),
                ("Recording disclosure",   "boolean -- compliance audit trail"),
                ("Transcript link",        "full text of the conversation"),
                ("Recording link",         "audio"),
                ("Callback requested",     "boolean + requested time if applicable"),
            ],
            [2.2 * inch, 4.8 * inch], s),
        sp(18),
    ]

    # ── 6. TECHNOLOGY ─────────────────────────────────────────────────────────
    story += [
        divider("The technology picture"),
        sp(10),
        sub("LiveVox integration (Russell)", s),
        body("LiveVox is where everything lives -- the lead list, the recordings, the dispositions. "
             "The simplest starting point is a daily batch file that LiveVox exports and we pull in. "
             "We can upgrade to real-time API once we've validated the setup. "
             "We just need read access for the list and write access to post outcomes back.", s),
        sp(10),
        sub("Caller ID (Russell)", s),
        body("You're already looking at branded LCIDs (~$1k/month for a couple numbers) and rotating "
             "local presence numbers (602, 480, 407, etc.). That's exactly the right approach. "
             "We've seen branded ID lift connect rates meaningfully, especially with iOS screening. "
             "We'll match whatever number pool you give us.", s),
        sp(10),
        sub("Warm transfer (Jay)", s),
        body("When Andie is ready to hand off, she bridges the call to a closer and passes a summary "
             "of what she learned. The closer gets that context the moment they pick up -- "
             "no need for the member to repeat themselves. "
             "We'll connect to whatever endpoint you're using (SIP, PSTN, or LiveVox internal).", s),
        sp(10),
        sub("TCPA compliance", s),
        body("Recording disclosure in the first 10 seconds, state-by-state consent handling, "
             "litigator list suppression, DNC scrubbing. We build all of that in from day one. "
             "We'll need the approved disclosure language from your legal team to make sure "
             "we're saying it exactly right.", s),
        sp(10),
        sub("iOS call screening -- the elephant in the room", s),
        body("iOS 17 and iOS 18 introduced aggressive call-screening behavior that has "
             "reduced outbound connect rates across the industry by roughly 30%. This is "
             "the single biggest threat to any AI dialer program, and we're treating it "
             "as a first-class problem -- not a footnote.", s),
        sp(6),
        body("How we're attacking it on the Andie pilot:", s),
        sp(4),
        bul("<b>Branded Caller ID (RCD).</b> Pilot the LCIDs Russell is already evaluating "
            "(~$1k/month for a couple of numbers) so the recipient sees 'Government "
            "Vacation Rewards' instead of an unknown 10-digit string. Biggest single lift.", s),
        bul("<b>STIR/SHAKEN A-attestation.</b> Verify your Twilio trunk is ship A-attested "
            "(not B/C). Carriers route A-attested numbers through fewer screening filters. "
            "Russell to confirm current attestation level on the GVR trunk.", s),
        bul("<b>Local-presence number rotation.</b> Match the recipient's area code (602, "
            "480, 407, etc.). You're already doing this -- we'll match whatever pool you "
            "rotate through, and we'll add carrier-level reputation monitoring so we can "
            "retire numbers before they get spam-flagged.", s),
        bul("<b>Voice that sounds human.</b> Andie uses Cartesia Sonic-3 with natural "
            "pacing tuned for PSTN audio compression. iOS screening models trained on "
            "DTMF-style robocall audio typically pass through natural-cadence voices.", s),
        bul("<b>Voicemail drop fallback.</b> If a call hits voicemail, Andie leaves a "
            "personalized message rather than dead-air -- which generates inbound "
            "callbacks that bypass the screening problem entirely (Chris's 50% inbound "
            "lift stat).", s),
        sp(8),
        body("<b>What this means for the pilot KPI baseline.</b> The Philippines fronter "
             "team is operating in the same iOS environment (~10% connect rate confirmed "
             "on the call). We're not asking to be measured against pre-iOS connect rates "
             "from 2023 -- we're asking to be measured against the current Philippines "
             "baseline, with an explicit shared goal of moving that number up via the "
             "tactics above. Concrete starting expectation: <b>match the 10% baseline in "
             "Week 1, target 12-15% by Week 4 with branded ID + voicemail drops live.</b>", s),
        sp(18),
    ]

    # ── 7. VOICE ──────────────────────────────────────────────────────────────
    story += [
        divider("Voice selection"),
        sp(10),
        body("Given GVR's demographic (US military, veterans, federal civilians), we're "
             "defaulting to clearly American-English voices with natural cadence. "
             "Below are five candidates Jay and the team can A/B on the test line. "
             "Current production primary is Voice F1 (Jacqueline). Three female + two "
             "male options give the team real range to compare.", s),
        sp(8),
        mktable(
            ["Voice", "ID / Engine", "Description", "Gender"],
            [
                ("F1 -- Jacqueline (current)",
                 "cartesia/sonic-3<br/>9626c31c-...c8bc",
                 "Confident, young American adult female. Mid-American accent, "
                 "warm-but-professional, natural breath cadence. Currently in "
                 "production on the test line.",
                 "Female"),
                ("F2 -- Nora",
                 "cartesia/sonic-3<br/>(library voice)",
                 "Mature American female, slightly lower register than F1. "
                 "Reads as more experienced -- 'rep who's been doing this 10 "
                 "years'. Good for older-skewing GVR cohort.",
                 "Female"),
                ("F3 -- Steppe",
                 "rime/mistv3<br/>steppe",
                 "Mid-American female, lighter register, slight upbeat. "
                 "Was the original Andie voice before the Cartesia switch. "
                 "Kept as fallback voice in production.",
                 "Female"),
                ("M1 -- Blake",
                 "cartesia/sonic-3<br/>a167e0f3-...fdab",
                 "Energetic American adult male. Higher energy than the female "
                 "voices -- worth A/B-ing on younger military demographic and "
                 "follow-up calls.",
                 "Male"),
                ("M2 -- Tundra",
                 "rime/mistv3<br/>tundra",
                 "Calm American male, lower register, professional cadence. "
                 "Good if the team prefers a 'senior account manager' feel "
                 "over an upbeat fronter.",
                 "Male"),
            ],
            widths=[1.5 * inch, 1.6 * inch, 2.7 * inch, 0.7 * inch],
            s=s,
            shade_col=0,
        ),
        sp(8),
        body("Jay and team -- call the test line (number you already have) for each "
             "voice you want to hear. Tell us which one converts best in your gut, and "
             "we'll lock it in before pilot go-live. We can swap the voice any time, "
             "even mid-pilot, in 60 seconds.", s),
        sp(18),
    ]

    # ── 8. DASHBOARD ──────────────────────────────────────────────────────────
    story += [
        divider("Dashboard"),
        sp(10),
        body("The dashboard is already live and accessible to your team right now -- "
             "no separate link will be sent, you can use the details below directly:", s),
        sp(8),
        mktable(
            ["", ""],
            [
                ("URL",
                 "<font face='Courier' size='10'>https://arrivia.voxaris.io/dashboard</font>"),
                ("Username",
                 "<font face='Courier' size='10'>arrivia</font>"),
                ("Password (interim)",
                 "<font face='Courier' size='10'>demo2026</font>"),
                ("Recommended access",
                 "Bookmark the URL above. Each stakeholder can use the shared login "
                 "during the intake/sandbox period; per-user credentials will replace "
                 "this before pilot go-live (June 1)."),
                ("Per-user credentials",
                 "Provisioned by May 22, 2026 -- four named accounts for Chris Cole, "
                 "Jay Bankhead, Russell Reese, and Stacey Sutherland. Voxaris will email "
                 "each stakeholder a password reset link the day they're created."),
            ],
            widths=[1.8 * inch, 4.7 * inch],
            s=s,
            shade_col=0,
        ),
        sp(10),
        body("Right now the dashboard shows calls answered, engagement past intro, "
             "warm handoffs, top objections, and the outbound dial trigger. The KPI "
             "view will be built out to match what Jay and Chris actually care about. "
             "Working list:", s),
        sp(4),
        bul("Connect-completion rate vs. Philippines baseline (~5.9% transfers/connects)", s),
        bul("Transfer rate (% of connects that become warm handoffs)", s),
        bul("Revenue attributed to Andie-sourced transfers", s),
        bul("Top objections (auto-categorized from transcripts)", s),
        bul("Inbound callback lift (50% of your inbound today traces to outbound -- let's track if that moves)", s),
        bul("Cost per transfer running total", s),
        sp(6),
        body("Chris, Jay -- tell us what's missing and we'll add it.", s),
        sp(18),
    ]

    # ── 8b. PILOT SUCCESS CRITERIA / KPIs ─────────────────────────────────────
    story += [
        divider("Pilot success criteria / KPIs"),
        sp(10),
        body("This is what 'success' means for Andie at the end of the 60-day pilot. "
             "Payment activation on September 1, 2026 is gated on hitting these. "
             "Baselines are pulled from the April 30 discovery call -- if any are off, "
             "Russell flags them and we update.", s),
        sp(8),
        mktable(
            ["KPI", "Philippines baseline", "Andie target (60-day)"],
            [
                ("Connect-to-transfer rate",
                 "~5.9% (177 transfers / 3,000 connects, per 4/24 sample)",
                 "Match by Week 4. Beat by Week 8."),
                ("Connect rate (dials -> live answer)",
                 "~10% (post-iOS screening baseline)",
                 "Match in Week 1. 12-15% by Week 4 with branded ID + voicemail drops."),
                ("Warm-transfer quality score",
                 "TBD -- Jay to grade 50 sample transfers from Andie pilot Week 1-2 "
                 "for discovery completeness, brief accuracy, handoff cleanliness.",
                 "Match Philippines top-quartile by Week 6."),
                ("Closer conversion on Andie-sourced transfers",
                 "TBD -- Jay's team baseline conversion on Philippines-sourced transfers.",
                 "At or above the Philippines baseline."),
                ("Cost per transfer",
                 "~$19k/fronter/month / ~150 transfers/day per fronter team",
                 "Track AI infrastructure cost per Andie transfer. Target: meaningfully "
                 "lower per transfer than the Philippines team."),
                ("Inbound callback lift from outbound footprint",
                 "~50% of inbound traces to outbound dialer",
                 "Maintain or improve. Voicemail drops should bump this."),
                ("TCPA / compliance incidents",
                 "0",
                 "0 -- non-negotiable. Hard fail of pilot if breached."),
            ],
            widths=[1.6 * inch, 2.45 * inch, 2.45 * inch],
            s=s,
            shade_col=0,
        ),
        sp(10),
        body("<b>Evaluation cadence.</b> Weekly Thursday review at 12:00 PM EST with "
             "Chris, Jay, Russell, Stacey, Ethan. Mid-pilot formal review July 1. "
             "Final results presented August 18. Payment activation September 1, 2026 "
             "if KPIs above are confirmed met by both sides.", s),
        sp(8),
        body("<b>Payment trigger (per the 60-day timeline doc).</b> Upon Andie proving "
             "agreed KPIs, Arrivia pays Voxaris 3% of upgrade gross revenue on all "
             "conversions where (1) Andie served as fronter and (2) an Arrivia agent "
             "closed the upgrade. Full terms live in the Voxaris-Arrivia AI Services "
             "Agreement (presented May 20, executed by May 25).", s),
        sp(18),
    ]

    # ── 9. WHAT WE NEED FROM YOU ──────────────────────────────────────────────
    story += [
        divider("What we need from you"),
        sp(10),
        body("Short list, no drama. Just the things we can't build without:", s),
        sp(8),
        mktable(
            ["What", "Who", "Why we need it"],
            [
                ("1,000 successful fronter transcripts",
                 "Jay",
                 "We model Andie's flow on your best fronters. Jay mentioned he can pull these."),
                ("1,000 unsuccessful transcripts",
                 "Jay",
                 "Equally useful -- knowing what didn't work is half the job."),
                ("LiveVox API access or test environment",
                 "Russell",
                 "List in, dispositions out. Sandbox first so we don't touch production."),
                ("Approved recording disclosure language",
                 "Arrivia legal",
                 "We're already disclosing in the first 10s -- just need the exact approved wording."),
                ("Closer transfer endpoint",
                 "Jay",
                 "SIP, PSTN, or LiveVox internal -- wherever you want Andie to bridge the call."),
                ("Lead field mapping from LiveVox",
                 "Russell",
                 "The column names in your LiveVox export so we map them correctly."),
                ("Voice selection",
                 "Jay + team",
                 "Call the test line, pick a voice, and let us know."),
                ("Forbidden phrases / claims",
                 "Jay + legal",
                 "Anything you don't want Andie saying. Pricing, comparisons, competitor names, etc."),
            ],
            [2.3 * inch, 1.0 * inch, 3.7 * inch], s),
        sp(8),
        note("That's it. Everything else we figure out as we go. The goal is to have Andie "
             "running on a sandbox call list within two weeks of the SOW signing.", s),
        sp(18),
    ]

    story += [
        sp(4),
        hrule(),
        body("-- Ethan Stopperich, Voxaris", s),
        body("ethan@voxaris.io  |  voxaris.io", s),
        body("May 5, 2026", s),
    ]

    out = os.path.abspath(OUTPUT)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    deco = PageDeco()
    doc = SimpleDocTemplate(
        out, pagesize=letter,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=0.75 * inch, bottomMargin=0.72 * inch,
        title="Voxaris x Arrivia -- GVR Pilot Call Summary",
        author="Ethan Stopperich, Voxaris",
        subject="GVR Pilot -- Call Summary and Next Steps",
    )
    doc.build(story, onFirstPage=deco, onLaterPages=deco)
    print("PDF written -->", out)


if __name__ == "__main__":
    build()
