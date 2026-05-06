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

    # ── 1. WHAT WE HEARD ──────────────────────────────────────────────────────
    story += [
        divider("What we heard"),
        sp(10),
        body("Arrivia operates a fronter program for Government Vacation Rewards "
             "(GVR) out of the Philippines: agents call the cold and warm "
             "propensity base, run light discovery, and warm-transfer to a "
             "U.S.-based closer. The fronter role is intentionally narrow -- "
             "no pricing, no heavy qualification, no selling. Just confirm the "
             "member is real, get a read on their travel intent, and hand them "
             "off with context.", s),
        sp(6),
        body("The pilot scope is GVR's free-membership cold/warm pool. Hot leads "
             "(same-day enrollments, recent bookers) stay with Jay's outbound "
             "sales reps -- they convert too well to mix in. If GVR works, the "
             "next brands on the list are iCruise, Smarter Getaways, and others.", s),
        sp(18),
    ]

    # ── 2. THE NUMBERS THAT CAME OUT OF THEIR MOUTHS ──────────────────────────
    story += [
        divider("The numbers that came out of their mouths"),
        sp(10),
        body("Pulled directly from the April 30 discovery call. The "
             "<b>Implication</b> column is our read on what each number actually "
             "means -- flag anything we got wrong.", s),
        sp(8),
        mktable(
            ["Metric", "Value", "Implication"],
            [
                ("Fronter agents",
                 "23 total (14 deployed + 9 new hires only ~4 days on phones)",
                 "True productive headcount is ~14, not 23. Their '23' math inflates baseline."),
                ("Revenue per fronter / month",
                 "$19,000",
                 "Their declared baseline. <b>This is the number Voxaris is being measured against.</b>"),
                ("Total fronter revenue / month",
                 "\"$400-$450k\" (Chris revised himself DOWN mid-sentence)",
                 "Revenue is volatile or declining. The $50k self-correction is a tell."),
                ("Hot-lead callback revenue",
                 "$200k/month",
                 "Adjacent stream -- not part of pilot but adjacent upside."),
                ("Reload (upgrade existing) revenue",
                 "\"Couple hundred thousand/month\"",
                 "Phase 2 expansion target."),
                ("Daily dial volume",
                 "30,000 dials",
                 "Massive outbound throughput."),
                ("Connect rate",
                 "~10%",
                 "= 3,000 live connects/day across 23 agents = ~130 connects per agent per day."),
                ("Transfers to closer",
                 "150-200/day (avg ~180)",
                 "= ~8 transfers per agent per day."),
                ("Transfer rate (of connects)",
                 "~6%",
                 "This is the real top-of-funnel conversion."),
                ("Contact cadence",
                 "3-4x per year, <b>5-6 attempts per quarter</b>",
                 "Heavy re-dial pattern."),
                ("Work week",
                 "M-F only (Philippines), Saturday volunteer",
                 "<b>Weekend coverage = unclaimed Andie territory.</b>"),
                ("Best hours",
                 "Nights + weekends",
                 "Off-shore can't fully cover this -- Andie's natural advantage."),
                ("Member type",
                 "<b>100% free-tier</b> members in this campaign",
                 "All upsell, no acquisition."),
                ("Inbound lift from outbound",
                 "50% of all inbound traces back to the outbound footprint -- voicemails, hang-ups, missed calls that generated a return",
                 "Example: 10,000 weekly inbound calls = ~5,000 originated from outbound."),
            ],
            [1.5 * inch, 2.6 * inch, 2.9 * inch], s),
        sp(10),
        body("<b>Implied funnel math (annualized, using their numbers):</b>", s),
        sp(4),
        bul("30,000 dials/day x 250 work days = 7.5M dials/year", s),
        bul("750k connects/year -> 45k transfers/year x at 14% closer rate (from the "
            "transcripts we read) = ~6,300 closes/year x $1,999 = <b>$12.6M/year revenue</b>", s),
        sp(8),
        note("The hot leads (same-day enrollments, recent bookers) stay with Jay's "
             "outbound sales reps -- those convert too well to mix into this program. "
             "We're focused on the large cold/warm free-tier base.", s),
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

    # ── 6. PROBLEMS THEY FLAGGED ──────────────────────────────────────────────
    story += [
        divider("Problems they flagged on the call"),
        sp(10),
        body("Things Chris, Jay, and Russell raised as active pain or open "
             "questions. Captured here so they don't get lost between now and the SOW.", s),
        sp(8),
        mktable(
            ["Problem", "What they said"],
            [
                ("iOS call screening",
                 "Russell -- connect rates have dropped meaningfully on iOS 17/18. "
                 "Currently mitigating with HCI (Human Call Interface) routing through "
                 "LiveVox; evaluating branded LCIDs at ~$1k/month."),
                ("Number reputation",
                 "Russell -- rotating local-presence numbers (602, 480, 407, etc.) plus "
                 "spam-likely scrubbing. Branded ID pilot planned for this month."),
                ("Off-shore voice perception",
                 "Chris/Jay -- military/government demographic doesn't always engage with "
                 "Philippines-accented agents. Crisp noise cancellation in use; accent "
                 "transformation tested without ROI."),
                ("New-hire ramp",
                 "Jay -- 9 of 23 fronters have only ~4 days on phones. The $19k/agent "
                 "baseline is dragged down by the unramped tail."),
                ("Weekend / nights coverage gap",
                 "Chris/Jay -- best contact hours are nights and weekends. Philippines "
                 "team works M-F to mirror the U.S. closers; Saturday is volunteer-only."),
                ("Discovery quality at handoff",
                 "Jay -- best transfers carry detail. The more the closer knows up front, "
                 "the more it converts. Cold transfers underperform."),
            ],
            [1.7 * inch, 5.3 * inch], s),
        sp(18),
    ]

    # ── 7. WHAT WE NEED FROM YOU ──────────────────────────────────────────────
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
