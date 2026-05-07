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

    # ── 1. QUICK RECAP ────────────────────────────────────────────────────────
    story += [
        divider("Quick recap"),
        sp(10),
        body("Here's what we caught from the April 30 call -- a snapshot of "
             "the GVR fronter program as it runs today. Read through, and "
             "wherever something's off or missing, just tell us. The rest of "
             "this doc is questions and asks so we can fill in the gaps and "
             "start building.", s),
        sp(18),
    ]

    # ── 2. NUMBERS WE CAUGHT ──────────────────────────────────────────────────
    story += [
        divider("Numbers we caught"),
        sp(10),
        body("Quick reference -- if any of these read wrong, flag it.", s),
        sp(8),
        mktable(
            ["Metric", "What you told us"],
            [
                ("Fronter agents",                "23 total (14 deployed + 9 new hires only ~4 days on phones)"),
                ("Revenue per fronter / month",   "$19,000"),
                ("Total fronter revenue / month", "$400-$450k"),
                ("Hot-lead callback revenue",     "$200k/month"),
                ("Reload (upgrade) revenue",      "\"Couple hundred thousand/month\""),
                ("Daily dial volume",             "30,000 dials"),
                ("Connect rate",                  "~10% (~3,000 connects/day)"),
                ("Transfers to closer",           "150-200/day (avg ~180; 177 Thu, 181 Fri last week)"),
                ("Transfer rate of connects",     "~6%"),
                ("Contact cadence",               "3-4x per year, 5-6 attempts per quarter, ~7 campaigns"),
                ("Work week",                     "Monday-Friday (Philippines), Saturday volunteer"),
                ("Best hours",                    "Nights and weekends"),
                ("Member type",                   "100% free-tier in this campaign"),
                ("Inbound lift from outbound",    "~50% of inbound traces back to the outbound footprint"),
                ("Lead pool for this pilot",      "Free-membership cold/warm base (NOT hot daily enrollments)"),
            ],
            [2.3 * inch, 4.7 * inch], s),
        sp(18),
    ]

    # ── 3. iOS CALL SCREENING ─────────────────────────────────────────────────
    story += [
        divider("iOS call screening"),
        sp(10),
        body("Russell flagged this as the big challenge -- recent iOS updates "
             "have cut connect rates by roughly 30 percent. Here's what we heard "
             "Arrivia is already doing about it. Russell, fill in anything we "
             "missed.", s),
        sp(8),
        bul("<b>HCI routing through LiveVox.</b> Human clicker confirms each "
            "dial -- keeps you inside legal dialing requirements.", s),
        bul("<b>Local-presence rotation.</b> Numbers in matching area codes "
            "(602, 480, 407, etc.) rotated across the dial pool.", s),
        bul("<b>Spam-likely scrubbing.</b> Third-party service scrubs against "
            "spam flags and provides a 3-letter brand acronym (name TBD).", s),
        bul("<b>Branded LCID pilot.</b> Planned for this month -- ~$1,000/month "
            "for a couple of LCIDs. One variable at a time so the lift is "
            "measurable.", s),
        bul("<b>Crisp noise cancellation.</b> On the Philippines floor for "
            "noise; accent transformation tested without ROI and turned off.", s),
        sp(18),
    ]

    # ── 4. WALK US THROUGH A DAY ──────────────────────────────────────────────
    story += [
        divider("Walk us through a day"),
        sp(10),
        body("We caught the high-level flow on the call. What we're missing is "
             "the day-to-day texture. If you can answer any of these in a quick "
             "voice memo or a Slack thread, that's plenty -- doesn't need to be "
             "formal.", s),
        sp(8),
        bul("<b>Lead pool flow.</b> When does the daily list drop into LiveVox? "
            "Who builds it, who QC's it, and how does it get split across the "
            "fronter team?", s),
        bul("<b>Clicker desk.</b> How many HCI clickers are running concurrently? "
            "What's the click rate per clicker, and how does the dialer hand "
            "voice passes to a fronter once a human picks up?", s),
        bul("<b>A typical fronter shift.</b> Walk us through the first hour of a "
            "fronter's day -- login, queue, first dial, first transfer. What do "
            "they actually see on screen and click on?", s),
        bul("<b>Transfer experience.</b> When a fronter warm-transfers, what "
            "does the closer hear and see? Is there a brief, a screen pop, "
            "anything in the CRM that shows up?", s),
        bul("<b>Disposition + write-back.</b> After a call wraps, what gets "
            "logged automatically vs typed in by the fronter? Where do "
            "recordings, transcripts, and dispositions live in LiveVox?", s),
        bul("<b>Performance review cadence.</b> How often does Jay's team review "
            "fronter calls? What KPIs does each fronter see daily, weekly, "
            "monthly?", s),
        bul("<b>Compliance routine.</b> Who reviews recordings for disclosure "
            "compliance? What happens when something gets flagged?", s),
        sp(18),
    ]

    # ── 5. MATERIALS WE'D LOVE TO GET ─────────────────────────────────────────
    story += [
        divider("Materials we'd love to get"),
        sp(10),
        body("These are the things that let us start building Andie on real GVR "
             "data instead of guessing. Whatever you can grab is great -- doesn't "
             "have to be all at once.", s),
        sp(8),
        mktable(
            ["What", "Who'd grab it", "Quick context"],
            [
                ("Successful fronter call recordings or transcripts",
                 "Jay",
                 "Aim for ~1,000 if possible. We model Andie's tone and flow "
                 "directly on your best fronters. You mentioned you can pull these."),
                ("Unsuccessful / declined / wrong-person recordings",
                 "Jay",
                 "~1,000 if possible. Knowing what didn't work is half the job."),
                ("Current best-in-class fronter script",
                 "Jay",
                 "Whatever the team uses today, including the Balto-era version "
                 "if it's still around."),
                ("Approved recording disclosure language",
                 "Arrivia legal",
                 "The exact verbatim wording -- we'll bake it into the opener."),
                ("Forbidden phrases or claims list",
                 "Jay + legal",
                 "Anything Andie should never say. Pricing, comparisons, competitor "
                 "names, MLA-flagged language, etc."),
                ("LiveVox sandbox or sample export",
                 "Russell",
                 "Sandbox is ideal so we don't touch production. If that's a "
                 "lift, a sample CSV with the field names works as a starting point."),
                ("Lead field mapping from LiveVox",
                 "Russell",
                 "Just the column names in your export -- we'll match them on our "
                 "side."),
                ("Closer transfer endpoint",
                 "Jay",
                 "SIP, PSTN, or LiveVox internal -- wherever you want Andie to "
                 "bridge the call."),
                ("Voice picked from the test line",
                 "Jay + team",
                 "Whenever you've got a few minutes, call the test number, "
                 "listen, tell us which voice feels right."),
            ],
            [2.3 * inch, 1.0 * inch, 3.7 * inch], s),
        sp(18),
    ]

    # ── 6. THINGS WORTH FLAGGING ──────────────────────────────────────────────
    story += [
        divider("Things worth flagging"),
        sp(10),
        body("A few items came up on the call that aren't blockers but are "
             "worth keeping on the radar. Yell if any of these need a real "
             "conversation before pilot.", s),
        sp(8),
        bul("<b>Off-shore voice perception.</b> The military/government demographic "
            "doesn't always engage with Philippines-accented agents. Crisp is "
            "doing what it can; accent transformation didn't pencil out.", s),
        bul("<b>New-hire ramp.</b> 9 of 23 fronters have ~4 days on phones, "
            "which drags the $19k/agent baseline. Real productive headcount is "
            "closer to 14.", s),
        bul("<b>Weekend / nights coverage gap.</b> Best contact hours are "
            "nights and weekends, but Philippines mirrors the U.S. closer "
            "schedule. Saturday is volunteer-only.", s),
        bul("<b>Discovery quality at handoff.</b> Jay said it best -- the more "
            "the closer knows before they pick up, the more it converts. Cold "
            "transfers underperform.", s),
        sp(18),
    ]

    story += [
        sp(4),
        hrule(),
        body("-- Ethan Stopperich, Voxaris", s),
        body("ethan@voxaris.io  |  voxaris.io", s),
        body("May 6, 2026", s),
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
