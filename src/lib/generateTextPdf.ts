import jsPDF from "jspdf";

const NAVY: [number, number, number] = [26, 54, 93];
const GRAY: [number, number, number] = [120, 120, 120];
const LIGHT_GRAY: [number, number, number] = [220, 220, 220];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_LEFT = 14.1; // ~40pt
const MARGIN_RIGHT = 14.1;
const MARGIN_TOP = 21.2; // ~60pt
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;

function addFooters(doc: jsPDF, fundName: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const y = PAGE_H - 10;

    // Footer line
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, y - 4, PAGE_W - MARGIN_RIGHT, y - 4);

    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.setFont("helvetica", "normal");
    doc.text("DRAFT — Auditron", MARGIN_LEFT, y);
    doc.text(fundName, PAGE_W / 2, y, { align: "center" });
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN_RIGHT, y, { align: "right" });
  }
}

function addDraftWatermark(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(60);
    doc.setTextColor(220, 220, 220);
    doc.setFont("helvetica", "bold");
    doc.text("DRAFT", PAGE_W / 2, PAGE_H / 2, {
      align: "center",
      angle: 45,
    });
  }
}

export function generateTextPdf(
  content: string,
  fundName: string,
  financialYear: string | null,
  docType: "Audit_Report" | "Management_Letter"
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_TOP;

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines but add spacing
    if (!trimmed) {
      y += 4;
      if (y > PAGE_H - 25) {
        doc.addPage();
        y = MARGIN_TOP;
      }
      continue;
    }

    // Detect ALL CAPS lines as section headings (at least 4 chars, all uppercase letters/spaces/numbers)
    const isHeading = trimmed.length >= 4 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);

    if (isHeading) {
      // Page break before major sections (if not near top)
      if (y > MARGIN_TOP + 20) {
        doc.addPage();
        y = MARGIN_TOP;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...NAVY);
      const wrapped = doc.splitTextToSize(trimmed, CONTENT_W);
      for (const wl of wrapped) {
        if (y > PAGE_H - 25) { doc.addPage(); y = MARGIN_TOP; }
        doc.text(wl, MARGIN_LEFT, y);
        y += 7;
      }
      // Underline
      doc.setDrawColor(...NAVY);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_LEFT, y - 3, MARGIN_LEFT + 50, y - 3);
      y += 6;
    } else {
      // Body text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const wrapped = doc.splitTextToSize(trimmed, CONTENT_W);
      for (const wl of wrapped) {
        if (y > PAGE_H - 25) { doc.addPage(); y = MARGIN_TOP; }
        doc.text(wl, MARGIN_LEFT, y);
        y += 5;
      }
      y += 2;
    }
  }

  addDraftWatermark(doc);
  addFooters(doc, fundName);

  const safeName = fundName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
  const safeYear = (financialYear || "").replace(/[^a-zA-Z0-9-]/g, "_") || "Unknown_Year";
  doc.save(`${safeName}_${docType}_${safeYear}.pdf`);
}
