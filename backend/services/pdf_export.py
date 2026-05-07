"""
PDF Export Service — generates professional scan reports via ReportLab
"""

import io
from datetime import datetime
from typing import List, Dict, Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT


SEVERITY_COLORS = {
    "critical": colors.HexColor("#ef4444"),
    "high":     colors.HexColor("#f97316"),
    "medium":   colors.HexColor("#eab308"),
    "low":      colors.HexColor("#3b82f6"),
    "info":     colors.HexColor("#94a3b8"),
}

BG_DARK  = colors.HexColor("#0f172a")
BG_CARD  = colors.HexColor("#1e293b")
ACCENT   = colors.HexColor("#8b5cf6")
TEXT_LIGHT = colors.HexColor("#f1f5f9")
TEXT_MUTED = colors.HexColor("#94a3b8")


def generate_scan_pdf(scan: Dict[str, Any], findings: List[Dict[str, Any]]) -> bytes:
    """Generate a professional PDF report for a Nuclei scan."""
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        fontSize=24, textColor=TEXT_LIGHT, spaceAfter=4,
        fontName="Helvetica-Bold", alignment=TA_LEFT
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=11, textColor=TEXT_MUTED, spaceAfter=12,
        fontName="Helvetica", alignment=TA_LEFT
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Heading2"],
        fontSize=14, textColor=ACCENT, spaceAfter=8, spaceBefore=16,
        fontName="Helvetica-Bold"
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=9, textColor=TEXT_LIGHT, fontName="Helvetica", leading=14
    )
    mono_style = ParagraphStyle(
        "Mono", parent=styles["Normal"],
        fontSize=8, textColor=TEXT_MUTED, fontName="Courier", leading=12
    )

    story = []

    # ─── Header ───────────────────────────────────────────────────────────
    story.append(Paragraph("🔒 VulnX-Ray", title_style))
    story.append(Paragraph("Nuclei Vulnerability Scan Report", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=ACCENT))
    story.append(Spacer(1, 8 * mm))

    # ─── Scan metadata ────────────────────────────────────────────────────
    story.append(Paragraph("Scan Summary", section_style))

    started  = scan.get("started_at", "—")
    finished = scan.get("completed_at", "—")
    status   = scan.get("status", "unknown").upper()
    target   = scan.get("target", "—")

    sev_counts: Dict[str, int] = {}
    for f in findings:
        info = f.get("info", {}) if isinstance(f.get("info"), dict) else {}
        sev = (info.get("severity") or f.get("severity") or "info").lower()
        sev_counts[sev] = sev_counts.get(sev, 0) + 1

    meta_data = [
        ["Field", "Value"],
        ["Target",    target],
        ["Status",    status],
        ["Started",   started],
        ["Finished",  finished],
        ["Findings",  str(len(findings))],
        ["Critical",  str(sev_counts.get("critical", 0))],
        ["High",      str(sev_counts.get("high", 0))],
        ["Medium",    str(sev_counts.get("medium", 0))],
        ["Low",       str(sev_counts.get("low", 0))],
    ]

    meta_table = Table(meta_data, colWidths=[55 * mm, 115 * mm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0),  ACCENT),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("BACKGROUND",  (0, 1), (-1, -1), BG_CARD),
        ("TEXTCOLOR",   (0, 1), (-1, -1), TEXT_LIGHT),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BG_CARD, BG_DARK]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#334155")),
        ("PADDING",     (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 8 * mm))

    # ─── Findings ─────────────────────────────────────────────────────────
    story.append(Paragraph("Findings Detail", section_style))

    if not findings:
        story.append(Paragraph("✅ No vulnerabilities detected.", body_style))
    else:
        severity_order = ["critical", "high", "medium", "low", "info"]
        sorted_findings = sorted(
            findings,
            key=lambda x: severity_order.index(
                (x.get("info", {}).get("severity") if isinstance(x.get("info"), dict) else x.get("severity") or "info").lower()
            ) if (x.get("info", {}).get("severity") if isinstance(x.get("info"), dict) else x.get("severity") or "info").lower() in severity_order else 99
        )

        for i, finding in enumerate(sorted_findings, 1):
            info = finding.get("info", {}) if isinstance(finding.get("info"), dict) else {}
            sev   = (info.get("severity") or finding.get("severity") or "info").lower()
            name  = info.get("name") or finding.get("name") or "Unknown"
            tid   = finding.get("template-id") or finding.get("template_id") or "—"
            match = finding.get("matched-at") or finding.get("matched_at") or "—"
            desc  = info.get("description") or "No description available."

            sev_color = SEVERITY_COLORS.get(sev, TEXT_MUTED)

            finding_data = [
                [f"#{i}  {name}", sev.upper()],
                ["Template ID", tid],
                ["Matched At",  match],
                ["Description", Paragraph(str(desc)[:300], mono_style)],
            ]

            finding_table = Table(finding_data, colWidths=[80 * mm, 90 * mm])
            finding_table.setStyle(TableStyle([
                # Header row
                ("BACKGROUND",  (0, 0), (-1, 0),  BG_CARD),
                ("TEXTCOLOR",   (0, 0), (0, 0),   TEXT_LIGHT),
                ("TEXTCOLOR",   (1, 0), (1, 0),   sev_color),
                ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
                ("FONTSIZE",    (0, 0), (-1, 0),  10),
                # Body rows
                ("BACKGROUND",  (0, 1), (-1, -1), BG_DARK),
                ("TEXTCOLOR",   (0, 1), (-1, -1), TEXT_MUTED),
                ("FONTNAME",    (0, 1), (0, -1),  "Helvetica-Bold"),
                ("FONTNAME",    (1, 1), (1, -1),  "Helvetica"),
                ("FONTSIZE",    (0, 1), (-1, -1), 8),
                ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#334155")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING",(0, 0), (-1, -1), 6),
                ("TOPPADDING",  (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
                # Severity left border accent
                ("LINEWIDTH",   (0, 0), (0, 0),   3),
                ("LINECOLOR",   (0, 0), (0, 0),   sev_color),
            ]))

            story.append(KeepTogether([finding_table, Spacer(1, 4 * mm)]))

    # ─── Footer ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEXT_MUTED))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        f"Generated by VulnX-Ray • {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7,
                       textColor=TEXT_MUTED, alignment=TA_CENTER)
    ))

    doc.build(story)
    return buffer.getvalue()
