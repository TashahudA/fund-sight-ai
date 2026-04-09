import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

// ── PDF Generation ──

export function generateReportPdf(
  content: string,
  fundName: string,
  financialYear: string,
  fileBaseName: string
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight() - margin * 2;

  const lines = content.split("\n");
  let y = margin;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines with spacing
    if (!trimmed) {
      y += 4;
      if (y > pageHeight + margin) { doc.addPage(); y = margin; }
      continue;
    }

    // Major divider lines (═══) → horizontal rule
    if (/^[═]{3,}$/.test(trimmed)) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + pageWidth, y);
      y += 6;
      if (y > pageHeight + margin) { doc.addPage(); y = margin; }
      continue;
    }

    // Sub-header lines (──) → lighter rule + bold text
    if (/^[─]{2,}/.test(trimmed)) {
      const headerText = trimmed.replace(/^[─]+\s*/, "").replace(/\s*[─]+$/, "");
      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, y, margin + pageWidth, y);
      y += 5;
      if (headerText) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        const wrapped = doc.splitTextToSize(headerText, pageWidth);
        for (const wl of wrapped) {
          if (y > pageHeight + margin) { doc.addPage(); y = margin; }
          doc.text(wl, margin, y);
          y += 5.5;
        }
      }
      y += 2;
      continue;
    }

    // ALL CAPS section headers
    const isHeading = trimmed.length >= 4 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && !trimmed.includes("|");
    if (isHeading) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(26, 54, 93);
      const wrapped = doc.splitTextToSize(trimmed, pageWidth);
      for (const wl of wrapped) {
        if (y > pageHeight + margin) { doc.addPage(); y = margin; }
        doc.text(wl, margin, y);
        y += 6;
      }
      y += 2;
      continue;
    }

    // Replace any remaining ═ or ─ in body text with dashes
    const sanitized = trimmed.replace(/═/g, "-").replace(/─/g, "-");

    // Normal body text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const wrapped = doc.splitTextToSize(sanitized, pageWidth);
    for (const wl of wrapped) {
      if (y > pageHeight + margin) { doc.addPage(); y = margin; }
      doc.text(wl, margin, y);
      y += 5;
    }
    y += 1;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const fy = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(fundName, margin, fy);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - margin, fy, { align: "right" });
  }

  doc.save(`${fileBaseName}.pdf`);
}

// ── DOCX Generation ──

interface ParsedLine {
  type: "major-header" | "major-divider" | "sub-header" | "text" | "empty";
  text: string;
}

function parseContentLines(content: string): ParsedLine[] {
  const raw = content.split("\n");
  const parsed: ParsedLine[] = [];

  for (let i = 0; i < raw.length; i++) {
    const trimmed = raw[i].trim();
    if (!trimmed) {
      parsed.push({ type: "empty", text: "" });
    } else if (/^[═]{3,}$/.test(trimmed)) {
      parsed.push({ type: "major-divider", text: "" });
    } else if (/^[─]{2,}/.test(trimmed)) {
      const headerText = trimmed.replace(/^[─]+\s*/, "").replace(/\s*[─]+$/, "");
      parsed.push({ type: "sub-header", text: headerText || trimmed });
    } else if (
      trimmed.length >= 4 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && !trimmed.includes("|")
    ) {
      parsed.push({ type: "major-header", text: trimmed });
    } else {
      parsed.push({ type: "text", text: raw[i] });
    }
  }
  return parsed;
}

// Try to detect table rows (pipe-separated)
function isTableRow(text: string): boolean {
  return text.includes("|") && text.split("|").length >= 3;
}

function buildTableFromRows(rows: string[]): Table {
  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  const parsedRows = rows
    .filter(r => !r.trim().match(/^[\-|═─\s]+$/)) // skip separator rows
    .map(r =>
      r.split("|").map(c => c.trim()).filter(Boolean)
    );

  if (parsedRows.length === 0) return new Table({ rows: [] });

  const colCount = Math.max(...parsedRows.map(r => r.length));
  const colWidth = Math.floor(9360 / colCount);

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: Array(colCount).fill(colWidth),
    rows: parsedRows.map((cells, rowIdx) =>
      new TableRow({
        children: Array.from({ length: colCount }, (_, ci) =>
          new TableCell({
            borders,
            width: { size: colWidth, type: WidthType.DXA },
            shading: rowIdx === 0 ? { fill: "1A365D", type: ShadingType.CLEAR } : undefined,
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cells[ci] || "",
                    bold: rowIdx === 0,
                    color: rowIdx === 0 ? "FFFFFF" : "333333",
                    font: "Calibri",
                    size: 20,
                  }),
                ],
              }),
            ],
          })
        ),
      })
    ),
  });
}

export async function generateReportDocx(content: string, fileBaseName: string) {
  const parsed = parseContentLines(content);
  const children: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < parsed.length) {
    const line = parsed[i];

    if (line.type === "major-divider") {
      // Skip pure divider lines — the headers handle spacing
      i++;
      continue;
    }

    if (line.type === "major-header") {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 160 },
          children: [
            new TextRun({ text: line.text, bold: true, font: "Calibri", size: 28, color: "1A365D" }),
          ],
        })
      );
      i++;
      continue;
    }

    if (line.type === "sub-header") {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
          children: [
            new TextRun({ text: line.text, bold: true, font: "Calibri", size: 24, color: "2D3748" }),
          ],
        })
      );
      i++;
      continue;
    }

    if (line.type === "empty") {
      children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      i++;
      continue;
    }

    // Check for table blocks
    if (isTableRow(line.text)) {
      const tableRows: string[] = [];
      while (i < parsed.length && parsed[i].type === "text" && isTableRow(parsed[i].text)) {
        tableRows.push(parsed[i].text);
        i++;
      }
      children.push(buildTableFromRows(tableRows));
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      continue;
    }

    // Normal text
    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: line.text, font: "Calibri", size: 22, color: "333333" }),
        ],
      })
    );
    i++;
  }

  const docxDoc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [{ children }],
  });

  const buffer = await Packer.toBlob(docxDoc);
  saveAs(buffer, `${fileBaseName}.docx`);
}
