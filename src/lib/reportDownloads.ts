// =============================================================================
// report-renderer.ts
// SMSF Audit Report Renderer — PDF (jsPDF) and DOCX (docx-js)
//
// Entry points:
//   generateReportPdf(payload: ReportPayload, fileBaseName: string)
//   generateReportDocx(payload: ReportPayload, fileBaseName: string)
//
// KEY DESIGN RULES:
//   1. The renderer NEVER prints regulatory-language warnings into the body.
//   2. gateFileForSignature() determines DRAFT vs SIGNABLE mode.
//   3. DRAFT mode: diagonal watermark on every page, Section G replaced with
//      a blockers list. SIGNABLE mode: clean output, Section G present.
//   4. All colour values come from PALETTE — no inline hex or RGB arrays.
//   5. y-position is threaded explicitly through every render helper
//      (no __lastY hacks on the doc object).
//   6. No magic-string prefix routing — everything is typed via ReportPayload.
// =============================================================================

import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  VerticalAlign,
  LevelFormat,
  TabStopType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
} from "docx";
import { saveAs } from "file-saver";

import {
  PALETTE,
  ReportPayload,
  WorkpaperPayload,
  Finding,
  FindingStatus,
  RiskLevel,
  MaterialityPayload,
  IndependencePayload,
  GateResult,
  gateFileForSignature,
  generateS129Notice,
  generateManagementLetterContent,
  generateIARContent,
  generateEngagementLetterContent,
  generateRepLetterContent,
  generateAuditPlanningMemo,
} from "./report-generator";

// =============================================================================
// 1. STATUS / RISK / OPINION colour helpers
//    All reads come from PALETTE — single source of truth.
// =============================================================================

type RgbColor = [number, number, number];
type ColorPair = { text: RgbColor; bg: RgbColor };
type DocxPair = { text: string; bg: string };

function statusColorPdf(status: FindingStatus): ColorPair & { label: string } {
  switch (status) {
    case "pass":
      return { text: PALETTE.GREEN.rgb, label: "PASS", bg: PALETTE.GREEN_BG.rgb };
    case "fail":
      return { text: PALETTE.RED.rgb, label: "FAIL", bg: PALETTE.RED_BG.rgb };
    case "needs_info":
      return { text: PALETTE.ORANGE.rgb, label: "INFO REQ", bg: PALETTE.ORN_BG.rgb };
    case "pass_with_review":
      return { text: PALETTE.ORANGE.rgb, label: "REVIEW", bg: PALETTE.ORN_BG.rgb };
    case "refer_to_auditor":
      return { text: PALETTE.BLUE.rgb, label: "REFER", bg: PALETTE.BLUE_BG.rgb };
    default:
      return { text: PALETTE.MGRAY.rgb, label: "N/A", bg: PALETTE.LGRAY.rgb };
  }
}

function statusColorDocx(status: FindingStatus): DocxPair & { label: string } {
  switch (status) {
    case "pass":
      return { text: PALETTE.GREEN.hex, label: "PASS", bg: PALETTE.GREEN_BG.hex };
    case "fail":
      return { text: PALETTE.RED.hex, label: "FAIL", bg: PALETTE.RED_BG.hex };
    case "needs_info":
      return { text: PALETTE.ORANGE.hex, label: "INFO REQ", bg: PALETTE.ORN_BG.hex };
    case "pass_with_review":
      return { text: PALETTE.ORANGE.hex, label: "REVIEW", bg: PALETTE.ORN_BG.hex };
    case "refer_to_auditor":
      return { text: PALETTE.BLUE.hex, label: "REFER", bg: PALETTE.BLUE_BG.hex };
    default:
      return { text: PALETTE.MGRAY.hex, label: "N/A", bg: PALETTE.LGRAY.hex };
  }
}

function riskColorPdf(risk: RiskLevel): ColorPair {
  switch (risk) {
    case "HIGH":
      return { text: PALETTE.RED.rgb, bg: PALETTE.RED_BG.rgb };
    case "MEDIUM":
      return { text: PALETTE.ORANGE.rgb, bg: PALETTE.ORN_BG.rgb };
    case "LOW":
      return { text: PALETTE.GREEN.rgb, bg: PALETTE.GREEN_BG.rgb };
  }
}

function riskColorDocx(risk: RiskLevel): DocxPair {
  switch (risk) {
    case "HIGH":
      return { text: PALETTE.RED.hex, bg: PALETTE.RED_BG.hex };
    case "MEDIUM":
      return { text: PALETTE.ORANGE.hex, bg: PALETTE.ORN_BG.hex };
    case "LOW":
      return { text: PALETTE.GREEN.hex, bg: PALETTE.GREEN_BG.hex };
  }
}

function opinionColorPdf(o: string): ColorPair {
  const v = o.toLowerCase();
  if (/unqualified|unmodified/.test(v)) return { text: PALETTE.GREEN.rgb, bg: PALETTE.GREEN_BG.rgb };
  if (/adverse|disclaim/.test(v)) return { text: PALETTE.RED.rgb, bg: PALETTE.RED_BG.rgb };
  if (/qualified|modified/.test(v)) return { text: PALETTE.ORANGE.rgb, bg: PALETTE.ORN_BG.rgb };
  return { text: PALETTE.DGRAY.rgb, bg: PALETTE.LGRAY.rgb };
}

function opinionColorDocx(o: string): DocxPair {
  const v = o.toLowerCase();
  if (/unqualified|unmodified/.test(v)) return { text: PALETTE.GREEN.hex, bg: PALETTE.GREEN_BG.hex };
  if (/adverse|disclaim/.test(v)) return { text: PALETTE.RED.hex, bg: PALETTE.RED_BG.hex };
  if (/qualified|modified/.test(v)) return { text: PALETTE.ORANGE.hex, bg: PALETTE.ORN_BG.hex };
  return { text: PALETTE.DGRAY.hex, bg: PALETTE.LGRAY.hex };
}

// =============================================================================
// 2. PUBLIC ENTRY POINTS — typed, no magic strings
// =============================================================================

export function generateReportPdf(payload: ReportPayload, fileBaseName: string): void {
  switch (payload.kind) {
    case "workpaper":
      buildWorkpaperPdf(payload.data, fileBaseName);
      break;
    case "engagement_letter":
      buildGenericPdf(generateEngagementLetterContent(payload.data), payload.data.fundName, fileBaseName);
      break;
    case "rep_letter":
      buildGenericPdf(generateRepLetterContent(payload.data), payload.data.fundName, fileBaseName);
      break;
    case "iar":
      buildGenericPdf(generateIARContent(payload.data), payload.data.fundName, fileBaseName);
      break;
    case "management_letter":
      buildGenericPdf(generateManagementLetterContent(payload.data), payload.data.fundName, fileBaseName);
      break;
    case "s129_notice":
      buildGenericPdf(generateS129Notice(payload.data), payload.data.fundName, fileBaseName);
      break;
    case "planning_memo":
      buildGenericPdf(generateAuditPlanningMemo(payload.data), payload.data.fundName, fileBaseName);
      break;
  }
}

export async function generateReportDocx(payload: ReportPayload, fileBaseName: string): Promise<void> {
  switch (payload.kind) {
    case "workpaper":
      await buildWorkpaperDocx(payload.data, fileBaseName);
      break;
    case "engagement_letter":
      await buildGenericDocx(generateEngagementLetterContent(payload.data), fileBaseName);
      break;
    case "rep_letter":
      await buildGenericDocx(generateRepLetterContent(payload.data), fileBaseName);
      break;
    case "iar":
      await buildGenericDocx(generateIARContent(payload.data), fileBaseName);
      break;
    case "management_letter":
      await buildGenericDocx(generateManagementLetterContent(payload.data), fileBaseName);
      break;
    case "s129_notice":
      await buildGenericDocx(generateS129Notice(payload.data), fileBaseName);
      break;
    case "planning_memo":
      await buildGenericDocx(generateAuditPlanningMemo(payload.data), fileBaseName);
      break;
  }
}

// =============================================================================
// 3. PDF CONTEXT — replaces the (doc as any).__lastY anti-pattern
// =============================================================================

interface PdfCtx {
  doc: jsPDF;
  y: number;
  ML: number; // left margin
  MR: number; // right margin
  CW: number; // content width
  PH: number; // page height
  FOOT: number; // footer reserved height
  fund: string;
  isDraft: boolean;
}

/** Advance y. If needed, add a new page and reset y to top margin. */
function need(ctx: PdfCtx, h: number): void {
  if (ctx.y + h > ctx.PH - ctx.FOOT) {
    addPageFooter(ctx);
    ctx.doc.addPage();
    ctx.y = ctx.ML;
    if (ctx.isDraft) stampDraftWatermark(ctx.doc, ctx.PH, ctx.ML + ctx.CW / 2);
  }
}

function gap(ctx: PdfCtx, mm = 4): void {
  ctx.y += mm;
}

function addPageFooter(ctx: PdfCtx): void {
  const fy = ctx.PH - 8;
  ctx.doc.setDrawColor(...PALETTE.BORDER.rgb);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.line(ctx.ML, fy - 4, ctx.ML + ctx.CW, fy - 4);
  ctx.doc.setFont("times", "normal");
  ctx.doc.setFontSize(7);
  ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
  ctx.doc.text(ctx.fund, ctx.ML, fy);
}

function stampDraftWatermark(doc: jsPDF, PH: number, cx: number): void {
  doc.saveGraphicsState?.();
  doc.setFont("times", "bold");
  doc.setFontSize(72);
  doc.setTextColor(220, 50, 50);
  // @ts-ignore — jsPDF internal for opacity
  if (doc.setGState) doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
  const cy = PH / 2;
  doc.text("DRAFT — NOT FOR SIGNATURE", cx, cy, { align: "center", angle: 45 });
  if (doc.setGState) doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.restoreGraphicsState?.();
}

// =============================================================================
// 4. PDF helpers
// =============================================================================

function sectionDivPdf(ctx: PdfCtx, label: string, title: string): void {
  need(ctx, 10);
  ctx.doc.setFillColor(...PALETTE.NAVY.rgb);
  ctx.doc.rect(ctx.ML, ctx.y, 14, 8, "F");
  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(10);
  ctx.doc.setTextColor(...PALETTE.WHITE.rgb);
  ctx.doc.text(label, ctx.ML + 7, ctx.y + 5.5, { align: "center" });
  ctx.doc.setFillColor(46, 68, 112);
  ctx.doc.rect(ctx.ML + 14, ctx.y, ctx.CW - 14, 8, "F");
  ctx.doc.setFontSize(11);
  ctx.doc.text(title, ctx.ML + 18, ctx.y + 5.5);
  ctx.y += 11;
}

function labelBarPdf(ctx: PdfCtx, label: string, bg: RgbColor, textColor: RgbColor = PALETTE.WHITE.rgb): void {
  need(ctx, 6);
  ctx.doc.setFillColor(...bg);
  ctx.doc.rect(ctx.ML, ctx.y, ctx.CW, 5.5, "F");
  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...textColor);
  ctx.doc.text(label, ctx.ML + 2, ctx.y + 3.8);
  ctx.y += 5.5;
}

function bulletListPdf(ctx: PdfCtx, items: string[], itemColor: RgbColor): void {
  if (!items?.length) return;
  for (const item of items) {
    const lines = ctx.doc.splitTextToSize(item, ctx.CW - 8);
    for (let li = 0; li < lines.length; li++) {
      need(ctx, 4.5);
      ctx.doc.setFont("times", "normal");
      ctx.doc.setFontSize(8);
      if (li === 0) {
        ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
        ctx.doc.text("-", ctx.ML + 2, ctx.y);
      }
      ctx.doc.setTextColor(...itemColor);
      ctx.doc.text(lines[li], ctx.ML + 6, ctx.y);
      ctx.y += 4.2;
    }
  }
}

type ColDef = { label: string; w: number };

function drawTableHeaderPdf(ctx: PdfCtx, cols: ColDef[]): void {
  ctx.doc.setFillColor(...PALETTE.NAVY.rgb);
  ctx.doc.rect(ctx.ML, ctx.y, ctx.CW, 6, "F");
  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(8.5);
  ctx.doc.setTextColor(...PALETTE.WHITE.rgb);
  let cx = ctx.ML + 1;
  for (const col of cols) {
    ctx.doc.text(col.label, cx, ctx.y + 4.2);
    cx += col.w * ctx.CW;
  }
  ctx.y += 6;
}

function drawTableRowPdf(
  ctx: PdfCtx,
  cols: ColDef[],
  cells: Array<{ text: string; bold?: boolean; color?: RgbColor }>,
  bg: RgbColor,
): void {
  const colWidths = cols.map((c) => c.w * ctx.CW);
  const wrapped = cells.map((cell, i) => {
    ctx.doc.setFont("times", cell.bold ? "bold" : "normal");
    ctx.doc.setFontSize(8);
    return ctx.doc.splitTextToSize(cell.text, colWidths[i] - 3);
  });
  const maxLines = Math.max(...wrapped.map((w) => w.length));
  const rowH = maxLines * 4.2 + 4;

  need(ctx, rowH);

  ctx.doc.setFillColor(...bg);
  ctx.doc.rect(ctx.ML, ctx.y, ctx.CW, rowH, "F");
  ctx.doc.setDrawColor(...PALETTE.BORDER.rgb);
  ctx.doc.setLineWidth(0.15);
  ctx.doc.rect(ctx.ML, ctx.y, ctx.CW, rowH);

  let cx = ctx.ML + 1;
  for (let i = 0; i < cells.length; i++) {
    ctx.doc.setFont("times", cells[i].bold ? "bold" : "normal");
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(...(cells[i].color ?? PALETTE.DGRAY.rgb));
    let ty = ctx.y + 4;
    for (const ln of wrapped[i]) {
      ctx.doc.text(ln, cx, ty);
      ty += 4.2;
    }
    cx += colWidths[i];
  }
  ctx.y += rowH;
}

// =============================================================================
// 5. FINDING RENDERER — PDF
//    Returns nothing; mutates ctx.y. No (doc as any).__lastY.
// =============================================================================

function renderFindingPdf(ctx: PdfCtx, f: Finding, idx: number): void {
  const st = statusColorPdf(f.status);
  const rc = riskColorPdf(f.risk_level || "MEDIUM");
  const shade = idx % 2 === 0 ? PALETTE.WHITE.rgb : PALETTE.LGRAY.rgb;
  const wpRef = `WP-${String(idx + 1).padStart(2, "0")}`;

  // ── Header: area | SIS ref | risk | status ─────────────────────────────────
  need(ctx, 14);
  ctx.doc.setFillColor(...shade);
  ctx.doc.rect(ctx.ML, ctx.y, ctx.CW, 13, "F");
  ctx.doc.setDrawColor(...PALETTE.BORDER.rgb);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.rect(ctx.ML, ctx.y, ctx.CW, 13);

  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(9.5);
  ctx.doc.setTextColor(...PALETTE.NAVY.rgb);
  ctx.doc.text(f.area, ctx.ML + 2, ctx.y + 5.5);
  ctx.doc.setFont("times", "normal");
  ctx.doc.setFontSize(7.5);
  ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
  ctx.doc.text(wpRef, ctx.ML + 2, ctx.y + 10);

  const refX = ctx.ML + ctx.CW * 0.42;
  ctx.doc.setFontSize(7);
  ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
  ctx.doc.text("SIS / Std Reference", refX, ctx.y + 4.5);
  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...PALETTE.NAVY.rgb);
  ctx.doc.text(f.reference || "N/A", refX, ctx.y + 9.5);

  const riskX = ctx.ML + ctx.CW * 0.62;
  ctx.doc.setFont("times", "normal");
  ctx.doc.setFontSize(7);
  ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
  ctx.doc.text("Inherent Risk (ASA 315)", riskX, ctx.y + 4.5);
  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...rc.text);
  ctx.doc.text((f.risk_level || "MEDIUM").toUpperCase(), riskX, ctx.y + 9.5);

  const resX = ctx.ML + ctx.CW * 0.82;
  ctx.doc.setFont("times", "normal");
  ctx.doc.setFontSize(7);
  ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
  ctx.doc.text("Result", resX, ctx.y + 4.5);
  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...st.text);
  ctx.doc.text(st.label, resX, ctx.y + 9.5);

  ctx.y += 14;

  // ── Section 1: Assertions ──────────────────────────────────────────────────
  labelBarPdf(ctx, "1. ASSERTIONS TESTED (ASA 315)", PALETTE.NAVY.rgb);
  if (f.assertions?.length) {
    bulletListPdf(ctx, f.assertions, PALETTE.DGRAY.rgb);
  } else {
    // Neutral placeholder — never a regulatory warning
    need(ctx, 4.5);
    ctx.doc.setFont("times", "italic");
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
    ctx.doc.text("To be completed by auditor.", ctx.ML + 3, ctx.y);
    ctx.y += 4.5;
  }

  // ── Section 2: Procedures ──────────────────────────────────────────────────
  labelBarPdf(ctx, "2. PROCEDURES PERFORMED (ASA 330)", PALETTE.NAVY2.rgb);
  if (f.procedures?.length) {
    bulletListPdf(ctx, f.procedures, PALETTE.DGRAY.rgb);
  } else {
    need(ctx, 4.5);
    ctx.doc.setFont("times", "italic");
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
    ctx.doc.text("To be completed by auditor.", ctx.ML + 3, ctx.y);
    ctx.y += 4.5;
  }

  // ── Section 3: Evidence ───────────────────────────────────────────────────
  labelBarPdf(ctx, "3. EVIDENCE OBTAINED (ASA 500)", PALETTE.TEAL.rgb);
  if (f.evidence?.length) {
    bulletListPdf(ctx, f.evidence, PALETTE.DGRAY.rgb);
  } else {
    need(ctx, 4.5);
    ctx.doc.setFont("times", "italic");
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
    ctx.doc.text("To be completed by auditor.", ctx.ML + 3, ctx.y);
    ctx.y += 4.5;
  }

  // ── Section 4: Exceptions ─────────────────────────────────────────────────
  labelBarPdf(ctx, "4. EXCEPTIONS / DEVIATIONS (ASA 230 para 16)", PALETTE.RUST.rgb);
  if (f.exceptions?.length) {
    bulletListPdf(ctx, f.exceptions, PALETTE.RED.rgb);
  } else {
    need(ctx, 4.5);
    ctx.doc.setFont("times", "normal");
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(...PALETTE.GREEN.rgb);
    ctx.doc.text("No exceptions noted.", ctx.ML + 3, ctx.y);
    ctx.y += 4.5;
  }

  // ── Section 5: Conclusion + sign-off ────────────────────────────────────────
  const concText = f.conclusion?.trim() || "Pending auditor review.";
  const concLines = ctx.doc.splitTextToSize(concText, ctx.CW - 6);
  const concH = concLines.length * 4.2 + 10;
  need(ctx, concH + 6);

  ctx.doc.setFillColor(...st.bg);
  ctx.doc.rect(ctx.ML, ctx.y, ctx.CW, concH, "F");
  ctx.doc.setDrawColor(...PALETTE.BORDER.rgb);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.rect(ctx.ML, ctx.y, ctx.CW, concH);
  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(7.5);
  ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
  ctx.doc.text("5. AUDITOR CONCLUSION (ASA 230)", ctx.ML + 2, ctx.y + 4);
  ctx.doc.setFont("times", "italic");
  ctx.doc.setFontSize(8.5);
  ctx.doc.setTextColor(...PALETTE.DGRAY.rgb);
  let cy = ctx.y + 9;
  for (const cl of concLines) {
    ctx.doc.text(cl, ctx.ML + 2, cy);
    cy += 4.2;
  }
  ctx.y = cy + 1;

  // Sign-off line
  const soH = 10;
  need(ctx, soH);
  ctx.doc.setDrawColor(...PALETTE.BORDER.rgb);
  ctx.doc.setLineWidth(0.15);
  ctx.doc.line(ctx.ML, ctx.y, ctx.ML + ctx.CW, ctx.y);
  ctx.doc.setFont("times", "normal");
  ctx.doc.setFontSize(7.5);
  ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
  ctx.doc.text(
    `Reviewed by: ${f.reviewed_by || "___________"}   Date: ${f.reviewed_at || "__________"}   Initials: _______`,
    ctx.ML + 2,
    ctx.y + 5,
  );
  ctx.y += soH + 3;
}

// =============================================================================
// 6. WORKPAPER PDF BUILDER
// =============================================================================

function buildWorkpaperPdf(wp: WorkpaperPayload, fileBaseName: string): void {
  const gate = gateFileForSignature(wp);
  const isDraft = !gate.ready;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 15;
  const MR = 15;
  const CW = PW - ML - MR;
  const FOOT = 16;

  const ctx: PdfCtx = { doc, y: ML, ML, MR, CW, PH, FOOT, fund: wp.meta.fundName, isDraft };

  const { meta, opinion, materiality, independence, findings, deterministicBlock, contraventions, rfis } = wp;

  const partAFindings = findings.filter((f) => f.scope === "applicable" && (f.part === "A" || f.part === "both"));
  const partBFindings = findings.filter((f) => f.scope === "applicable" && (f.part === "B" || f.part === "both"));

  // ── COVER ──────────────────────────────────────────────────────────────────
  if (isDraft) stampDraftWatermark(doc, PH, PW / 2);

  doc.setFillColor(...PALETTE.NAVY.rgb);
  doc.rect(0, 0, PW, 60, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...PALETTE.WHITE.rgb);
  doc.text("AUDIT WORKING PAPERS", PW / 2, 22, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.text(meta.fundName, PW / 2, 36, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Year ended 30 June ${meta.financialYear}`, PW / 2, 46, { align: "center" });
  doc.setFontSize(8);
  doc.text(`ABN ${meta.fundABN}`, PW / 2, 54, { align: "center" });

  if (isDraft) {
    doc.setFillColor(...PALETTE.RED_BG.rgb);
    doc.rect(ML, 62, CW, 8, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.RED.rgb);
    doc.text("DRAFT — NOT FOR SIGNATURE  |  Complete all working paper fields before signing Section G", PW / 2, 67.5, {
      align: "center",
    });
    ctx.y = 73;
  } else {
    ctx.y = 68;
  }

  // Cover: Fund Details | Opinion Summary
  const halfW = CW / 2 - 2;
  const opC = opinionColorPdf(opinion.overall ?? "");
  const fundRows = [
    { label: "ABN:", value: meta.fundABN ?? "N/A" },
    { label: "Financial Year:", value: `Year ended 30 June ${meta.financialYear}` },
    { label: "Prepared:", value: meta.preparedDate ?? "N/A" },
    { label: "Standard:", value: meta.standard ?? "ASA 230 / GS 009 / ASAE 3100" },
  ];
  const boxH = 8 + fundRows.length * 5.5 + 4;
  const boxTop = ctx.y;

  doc.setFillColor(...PALETTE.BLUE_BG.rgb);
  doc.rect(ML, boxTop, halfW, boxH, "F");
  doc.setDrawColor(...PALETTE.BORDER.rgb);
  doc.setLineWidth(0.2);
  doc.rect(ML, boxTop, halfW, boxH);
  doc.setFillColor(...opC.bg);
  doc.rect(ML + halfW + 4, boxTop, halfW, boxH, "F");
  doc.setDrawColor(...opC.text);
  doc.setLineWidth(0.4);
  doc.rect(ML + halfW + 4, boxTop, halfW, boxH);

  let bx = ML + 2;
  let by = boxTop + 6;
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.NAVY.rgb);
  doc.text("Fund Details", bx, by);
  by += 5;
  for (const fr of fundRows) {
    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PALETTE.DGRAY.rgb);
    doc.text(fr.label, bx, by);
    doc.setFont("times", "normal");
    doc.text(fr.value, bx + 32, by);
    by += 5.2;
  }

  bx = ML + halfW + 6;
  by = boxTop + 6;
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.NAVY.rgb);
  doc.text("Audit Opinion Summary", bx, by);
  by += 5;
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...opC.text);
  doc.text(`Overall: ${(opinion.overall ?? "PENDING").toUpperCase()}`, bx, by);
  by += 5;
  doc.setFont("times", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.MGRAY.rgb);
  const snippetLines = doc.splitTextToSize(opinion.reasoning ?? "", halfW - 6);
  for (const rl of snippetLines) {
    if (by > boxTop + boxH - 1) break;
    doc.text(rl, bx, by);
    by += 3.8;
  }
  ctx.y = boxTop + boxH + 6;

  // ── SECTION: INDEPENDENCE (before Part A) ──────────────────────────────────
  addPageFooter(ctx);
  doc.addPage();
  ctx.y = ML;
  if (isDraft) stampDraftWatermark(doc, PH, PW / 2);

  sectionDivPdf(ctx, "IND", "Independence Declaration  (APES 110)");
  gap(ctx, 3);
  renderIndependencePdf(ctx, independence);

  // ── SECTION: MATERIALITY ───────────────────────────────────────────────────
  gap(ctx, 6);
  sectionDivPdf(ctx, "MAT", "Materiality Assessment  (ASA 320)");
  gap(ctx, 3);
  renderMaterialityPdf(ctx, materiality);

  // ── PART A ─────────────────────────────────────────────────────────────────
  addPageFooter(ctx);
  doc.addPage();
  ctx.y = ML;
  if (isDraft) stampDraftWatermark(doc, PH, PW / 2);

  sectionDivPdf(ctx, "A", "Part A — Financial Audit Working Papers  (ASA 330 / GS 009 Part A)");
  gap(ctx, 3);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.MGRAY.rgb);
  const objA = doc.splitTextToSize(
    "Objective: Obtain sufficient appropriate audit evidence to form an opinion on the financial report (ASA 500). " +
      "Each area documents assertions tested, procedures performed, evidence obtained, exceptions, and the auditor's " +
      "conclusion to satisfy the reperformance test under ASA 230 para 8.",
    CW,
  );
  for (const l of objA) {
    need(ctx, 4);
    doc.text(l, ML, ctx.y);
    ctx.y += 4;
  }
  gap(ctx, 3);

  if (!partAFindings.length) {
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...PALETTE.MGRAY.rgb);
    doc.text("No Part A findings recorded.", ML, ctx.y);
    ctx.y += 5;
  } else {
    for (let i = 0; i < partAFindings.length; i++) {
      renderFindingPdf(ctx, partAFindings[i], i);
    }
  }

  // ── PART B ─────────────────────────────────────────────────────────────────
  addPageFooter(ctx);
  doc.addPage();
  ctx.y = ML;
  if (isDraft) stampDraftWatermark(doc, PH, PW / 2);

  sectionDivPdf(ctx, "B", "Part B — Compliance Engagement Working Papers  (ASAE 3100 / GS 009 Part B)");
  gap(ctx, 3);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.MGRAY.rgb);
  const objB = doc.splitTextToSize(
    "Objective: Obtain sufficient appropriate evidence to conclude on compliance with SISA/SISR provisions " +
      "specified in NAT 11466. Each area documents the specific provision tested, procedures performed, " +
      "evidence obtained, any deviations, and the auditor's conclusion.",
    CW,
  );
  for (const l of objB) {
    need(ctx, 4);
    doc.text(l, ML, ctx.y);
    ctx.y += 4;
  }
  gap(ctx, 3);

  if (!partBFindings.length) {
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...PALETTE.MGRAY.rgb);
    doc.text("No Part B findings recorded.", ML, ctx.y);
    ctx.y += 5;
  } else {
    for (let i = 0; i < partBFindings.length; i++) {
      renderFindingPdf(ctx, partBFindings[i], i);
    }
  }

  // ── SECTION C — Deterministic ──────────────────────────────────────────────
  addPageFooter(ctx);
  doc.addPage();
  ctx.y = ML;
  if (isDraft) stampDraftWatermark(doc, PH, PW / 2);

  sectionDivPdf(ctx, "C", "Deterministic Checks — Code Verified");
  gap(ctx, 3);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PALETTE.MGRAY.rgb);
  doc.text("Results computed arithmetically. Do not override with AI assessment.", ML, ctx.y);
  ctx.y += 5;

  for (const line of deterministicBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      gap(ctx, 2);
      continue;
    }
    const isBold = /PASS|FAIL|BREACH|MATERIALITY/.test(trimmed);
    const isBad = /BREACH|FAIL/.test(trimmed);
    const lns = doc.splitTextToSize(trimmed, CW);
    doc.setFont("times", isBold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...(isBad ? PALETTE.RED.rgb : PALETTE.DGRAY.rgb));
    for (const l of lns) {
      need(ctx, 4.5);
      doc.text(l, ML, ctx.y);
      ctx.y += 4.2;
    }
  }

  // ── SECTION D — Contraventions ─────────────────────────────────────────────
  gap(ctx, 6);
  sectionDivPdf(ctx, "D", "Contraventions Register  (s129/s130 SISA)");
  gap(ctx, 3);

  if (!contraventions.length) {
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...PALETTE.GREEN.rgb);
    doc.text("No contraventions identified.", ML, ctx.y);
    ctx.y += 5;
  } else {
    const dCols: ColDef[] = [
      { label: "#", w: 0.05 },
      { label: "SIS Section", w: 0.15 },
      { label: "Area", w: 0.2 },
      { label: "Severity", w: 0.12 },
      { label: "Details", w: 0.48 },
    ];
    drawTableHeaderPdf(ctx, dCols);
    contraventions.forEach((c, i) => {
      const sevColor: RgbColor = c.severity === "material" ? PALETTE.RED.rgb : PALETTE.ORANGE.rgb;
      drawTableRowPdf(
        ctx,
        dCols,
        [
          { text: String(i + 1), bold: true },
          { text: c.section, bold: true, color: PALETTE.NAVY.rgb },
          { text: c.area },
          { text: c.severity.toUpperCase(), bold: true, color: sevColor },
          { text: c.description },
        ],
        i % 2 === 0 ? PALETTE.WHITE.rgb : PALETTE.LGRAY.rgb,
      );
    });
    gap(ctx, 4);
  }

  // ── SECTION E — RFIs ───────────────────────────────────────────────────────
  gap(ctx, 6);
  sectionDivPdf(ctx, "E", "Requests for Information (RFIs)");
  gap(ctx, 3);

  if (!rfis.length) {
    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...PALETTE.GREEN.rgb);
    doc.text("No RFIs raised.", ML, ctx.y);
    ctx.y += 5;
  } else {
    const eCols: ColDef[] = [
      { label: "#", w: 0.05 },
      { label: "Priority", w: 0.1 },
      { label: "Request", w: 0.52 },
      { label: "Title", w: 0.2 },
      { label: "Status", w: 0.13 },
    ];
    drawTableHeaderPdf(ctx, eCols);
    rfis.forEach((r, i) => {
      const pc: RgbColor =
        r.priority === "HIGH" ? PALETTE.RED.rgb : r.priority === "MEDIUM" ? PALETTE.ORANGE.rgb : PALETTE.MGRAY.rgb;
      const stC: RgbColor = r.status === "RESOLVED" ? PALETTE.GREEN.rgb : PALETTE.ORANGE.rgb;
      drawTableRowPdf(
        ctx,
        eCols,
        [
          { text: String(i + 1), bold: true },
          { text: r.priority, bold: true, color: pc },
          { text: r.description },
          { text: r.title, bold: true, color: PALETTE.NAVY.rgb },
          { text: r.status, bold: true, color: stC },
        ],
        i % 2 === 0 ? PALETTE.WHITE.rgb : PALETTE.LGRAY.rgb,
      );
    });
    gap(ctx, 4);
  }

  // ── SECTION F — Opinion ────────────────────────────────────────────────────
  addPageFooter(ctx);
  doc.addPage();
  ctx.y = ML;
  if (isDraft) stampDraftWatermark(doc, PH, PW / 2);

  sectionDivPdf(ctx, "F", "Audit Opinion  (NAT 11466 / ASAE 3100)");
  gap(ctx, 4);

  const opLabel = (opinion.overall ?? "PENDING").toUpperCase();
  const reasonLines = doc.splitTextToSize(opinion.reasoning ?? "Opinion reasoning pending.", CW - 6);
  const opBoxH = 16 + reasonLines.length * 4.5;
  need(ctx, opBoxH);

  doc.setFillColor(...opC.bg);
  doc.rect(ML, ctx.y, CW, opBoxH, "F");
  doc.setDrawColor(...opC.text);
  doc.setLineWidth(0.5);
  doc.rect(ML, ctx.y, CW, opBoxH);
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...opC.text);
  doc.text(`Overall Opinion:  ${opLabel}`, ML + 3, ctx.y + 9);
  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.DGRAY.rgb);
  let oy = ctx.y + 15;
  for (const rl of reasonLines) {
    doc.text(rl, ML + 3, oy);
    oy += 4.5;
  }
  ctx.y = oy + 4;

  // ── SECTION G — Sign-off OR Blocker list ───────────────────────────────────
  addPageFooter(ctx);
  doc.addPage();
  ctx.y = ML;
  if (isDraft) stampDraftWatermark(doc, PH, PW / 2);

  if (isDraft) {
    renderDraftBlockersPdf(ctx, gate);
  } else {
    renderSignOffPdf(ctx);
  }

  // ── Page numbers ───────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let pg = 1; pg <= pageCount; pg++) {
    doc.setPage(pg);
    const fy2 = PH - 8;
    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...PALETTE.MGRAY.rgb);
    doc.text(`Page ${pg} of ${pageCount}`, PW - MR, fy2, { align: "right" });
  }

  doc.save(`${fileBaseName}.pdf`);
}

// ── Independence section — PDF ─────────────────────────────────────────────

function renderIndependencePdf(ctx: PdfCtx, ind: IndependencePayload): void {
  if (!ind) {
    ctx.doc.setFont("times", "italic");
    ctx.doc.setFontSize(8.5);
    ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
    ctx.doc.text(
      "To be completed — independence assessment required before audit commences (APES 110).",
      ctx.ML + 2,
      ctx.y,
    );
    ctx.y += 5;
    return;
  }

  const threats: Array<{ key: keyof IndependencePayload["threats"]; label: string }> = [
    { key: "self_review", label: "Self-review" },
    { key: "self_interest", label: "Self-interest" },
    { key: "advocacy", label: "Advocacy" },
    { key: "familiarity", label: "Familiarity" },
    { key: "intimidation", label: "Intimidation" },
  ];

  const tCols: ColDef[] = [
    { label: "Threat", w: 0.15 },
    { label: "Level", w: 0.12 },
    { label: "Assessment", w: 0.43 },
    { label: "Safeguards", w: 0.3 },
  ];
  drawTableHeaderPdf(ctx, tCols);

  for (let i = 0; i < threats.length; i++) {
    const t = threats[i];
    const ta = ind.threats[t.key];
    const lvl = ta.level.toUpperCase();
    const lc: RgbColor =
      ta.level === "significant"
        ? PALETTE.RED.rgb
        : ta.level === "moderate"
          ? PALETTE.ORANGE.rgb
          : ta.level === "low"
            ? PALETTE.ORANGE.rgb
            : PALETTE.GREEN.rgb;
    drawTableRowPdf(
      ctx,
      tCols,
      [
        { text: t.label, bold: true },
        { text: lvl, bold: true, color: lc },
        { text: ta.description },
        { text: ta.safeguards.join("; ") || "None required" },
      ],
      i % 2 === 0 ? PALETTE.WHITE.rgb : PALETTE.LGRAY.rgb,
    );
  }

  gap(ctx, 3);
  ctx.doc.setFont("times", "normal");
  ctx.doc.setFontSize(8.5);
  ctx.doc.setTextColor(...PALETTE.DGRAY.rgb);
  ctx.doc.text(`Declaration: ${ind.declaration}`, ctx.ML + 2, ctx.y);
  ctx.y += 5;
  ctx.doc.text(
    `Signed by: ${ind.signed_by || "___________"}   Date: ${ind.signed_date || "__________"}`,
    ctx.ML + 2,
    ctx.y,
  );
  ctx.y += 5;
}

// ── Materiality section — PDF ──────────────────────────────────────────────

function renderMaterialityPdf(ctx: PdfCtx, m: MaterialityPayload): void {
  if (!m) {
    ctx.doc.setFont("times", "italic");
    ctx.doc.setFontSize(8.5);
    ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
    ctx.doc.text(
      "To be completed — materiality assessment required before audit commences (ASA 320).",
      ctx.ML + 2,
      ctx.y,
    );
    ctx.y += 5;
    return;
  }

  const mCols: ColDef[] = [
    { label: "Item", w: 0.35 },
    { label: "Basis", w: 0.25 },
    { label: "Pct", w: 0.1 },
    { label: "Amount", w: 0.3 },
  ];
  drawTableHeaderPdf(ctx, mCols);

  const rows = [
    [
      "Overall Materiality",
      m.benchmark.replace(/_/g, " "),
      `${m.overall_pct}%`,
      `$${m.overall.toLocaleString("en-AU")}`,
    ],
    ["Performance Materiality", "% of overall", `${m.performance_pct}%`, `$${m.performance.toLocaleString("en-AU")}`],
    ["Clearly Trivial", "% of overall", `${m.trivial_pct}%`, `$${m.trivial.toLocaleString("en-AU")}`],
  ];
  rows.forEach((r, i) => {
    drawTableRowPdf(
      ctx,
      mCols,
      r.map((text, j) => ({ text, bold: j === 0 })),
      i % 2 === 0 ? PALETTE.WHITE.rgb : PALETTE.LGRAY.rgb,
    );
  });

  gap(ctx, 3);
  const ratLines = ctx.doc.splitTextToSize(`Rationale: ${m.rationale}`, ctx.CW);
  ctx.doc.setFont("times", "italic");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
  for (const l of ratLines) {
    need(ctx, 4);
    ctx.doc.text(l, ctx.ML + 2, ctx.y);
    ctx.y += 4;
  }
}

// ── DRAFT blockers section ─────────────────────────────────────────────────

function renderDraftBlockersPdf(ctx: PdfCtx, gate: GateResult): void {
  sectionDivPdf(ctx, "G", "File Incomplete — Cannot Be Signed  (ASA 230)");
  gap(ctx, 4);

  ctx.doc.setFillColor(...PALETTE.RED_BG.rgb);
  ctx.doc.rect(ctx.ML, ctx.y, ctx.CW, 12, "F");
  ctx.doc.setDrawColor(...PALETTE.RED.rgb);
  ctx.doc.setLineWidth(0.5);
  ctx.doc.rect(ctx.ML, ctx.y, ctx.CW, 12);
  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(10);
  ctx.doc.setTextColor(...PALETTE.RED.rgb);
  ctx.doc.text(
    "This file does not meet the ASA 230 reperformance test. The following items must be",
    ctx.ML + 3,
    ctx.y + 5,
  );
  ctx.doc.text("completed before this file can be signed.", ctx.ML + 3, ctx.y + 10);
  ctx.y += 16;

  const bCols: ColDef[] = [
    { label: "WP Ref", w: 0.1 },
    { label: "Area", w: 0.3 },
    { label: "Issue", w: 0.6 },
  ];
  drawTableHeaderPdf(ctx, bCols);
  gate.blockers.forEach((b, i) => {
    drawTableRowPdf(
      ctx,
      bCols,
      [{ text: b.wp_ref, bold: true, color: PALETTE.RED.rgb }, { text: b.area, bold: true }, { text: b.issue }],
      i % 2 === 0 ? PALETTE.RED_BG.rgb : PALETTE.WHITE.rgb,
    );
  });
}

// ── SIGNABLE sign-off section ──────────────────────────────────────────────

function renderSignOffPdf(ctx: PdfCtx): void {
  sectionDivPdf(ctx, "G", "Auditor Sign-Off  (ASA 230 / APES 110)");
  gap(ctx, 4);

  const checklist = [
    "reviewed all working papers contained in this file",
    "obtained sufficient appropriate audit evidence for each area documented",
    "conducted this audit in accordance with ASAE 3100 and ASA 200-899",
    "complied with independence requirements under APES 110",
    "identified and assessed all contraventions per ACR criteria (s129/s130)",
    "formed the opinion expressed in Section F",
  ];
  const signRows = ["Name:", "SMSF Auditor Number (SAN):", "Firm:", "Date:", "Signature:"];

  const leftW = ctx.CW / 2 - 2;
  const rightW = ctx.CW / 2 - 2;
  const leftH = 10 + checklist.length * 5 + signRows.length * 7 + 10;
  const rightH = 40;
  const soH = Math.max(leftH, rightH);
  need(ctx, soH);

  ctx.doc.setFillColor(...PALETTE.BLUE_BG.rgb);
  ctx.doc.rect(ctx.ML, ctx.y, leftW, soH, "F");
  ctx.doc.setDrawColor(...PALETTE.BORDER.rgb);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.rect(ctx.ML, ctx.y, leftW, soH);

  ctx.doc.setFillColor(...PALETTE.LGRAY.rgb);
  ctx.doc.rect(ctx.ML + leftW + 4, ctx.y, rightW, soH, "F");
  ctx.doc.rect(ctx.ML + leftW + 4, ctx.y, rightW, soH);

  let lx = ctx.ML + 3,
    ly = ctx.y + 6;
  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...PALETTE.NAVY.rgb);
  ctx.doc.text("Auditor Declaration", lx, ly);
  ly += 5;
  ctx.doc.setFont("times", "normal");
  ctx.doc.setFontSize(8.5);
  ctx.doc.setTextColor(...PALETTE.DGRAY.rgb);
  ctx.doc.text("I confirm that I have:", lx, ly);
  ly += 5;
  for (const item of checklist) {
    ctx.doc.text(`-  ${item}`, lx + 3, ly);
    ly += 4.8;
  }
  ly += 3;
  for (const row of signRows) {
    ctx.doc.text(row, lx, ly);
    ctx.doc.setDrawColor(...PALETTE.BORDER.rgb);
    ctx.doc.setLineWidth(0.25);
    ctx.doc.line(lx + 48, ly + 1, ctx.ML + leftW - 3, ly + 1);
    ly += 7;
  }

  let rx = ctx.ML + leftW + 7,
    ry = ctx.y + 6;
  ctx.doc.setFont("times", "bold");
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...PALETTE.NAVY.rgb);
  ctx.doc.text("Retention Notice  (ASA 230)", rx, ry);
  ry += 5;
  ctx.doc.setFont("times", "italic");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...PALETTE.MGRAY.rgb);
  const ret1 = ctx.doc.splitTextToSize(
    "Working papers must be retained for a minimum of 7 years from the date of signing (ASA 230, ASIC requirements).",
    rightW - 6,
  );
  const ret2 = ctx.doc.splitTextToSize(
    "An experienced auditor with no prior connection to this engagement should be able to understand, from these " +
      "working papers alone, the nature, timing and extent of audit procedures performed, evidence obtained, and " +
      "conclusions reached (ASA 230 para 8).",
    rightW - 6,
  );
  for (const l of ret1) {
    ctx.doc.text(l, rx, ry);
    ry += 4.2;
  }
  ry += 3;
  ctx.doc.setFont("times", "normal");
  for (const l of ret2) {
    ctx.doc.text(l, rx, ry);
    ry += 4.2;
  }

  ctx.y += soH + 4;
}

// =============================================================================
// 7. DOCX HELPERS
// =============================================================================

const NB = () => ({
  top: { style: BorderStyle.NONE, size: 0, color: PALETTE.WHITE.hex },
  bottom: { style: BorderStyle.NONE, size: 0, color: PALETTE.WHITE.hex },
  left: { style: BorderStyle.NONE, size: 0, color: PALETTE.WHITE.hex },
  right: { style: BorderStyle.NONE, size: 0, color: PALETTE.WHITE.hex },
});

const BDR = (color: string = PALETTE.BORDER.hex, sz = 4) => ({
  top: { style: BorderStyle.SINGLE, size: sz, color },
  bottom: { style: BorderStyle.SINGLE, size: sz, color },
  left: { style: BorderStyle.SINGLE, size: sz, color },
  right: { style: BorderStyle.SINGLE, size: sz, color },
});

const p = (
  runs: any[],
  spacing: { before?: number; after?: number } = { before: 0, after: 80 },
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
) => new Paragraph({ children: runs, spacing, alignment: align });

const t = (text: string, opts: { bold?: boolean; size?: number; color?: string; italic?: boolean } = {}) =>
  new TextRun({
    text,
    font: "Times New Roman",
    size: opts.size ?? 20,
    bold: opts.bold ?? false,
    color: opts.color ?? PALETTE.DGRAY.hex,
    italics: opts.italic ?? false,
  });

const gapD = (pt = 160) =>
  new Paragraph({ children: [new TextRun({ text: " ", size: 4 })], spacing: { before: 0, after: pt } });

const hRule = (color: string = PALETTE.BORDER.hex, sz = 6) =>
  new Paragraph({
    children: [],
    spacing: { before: 0, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: sz, color, space: 1 } },
  });

const tc = (children: any, width: number, opts: any = {}) =>
  new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: { size: width, type: WidthType.DXA },
    borders: opts.bord ?? BDR(),
    shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    margins: opts.m ?? { top: 80, bottom: 80, left: 140, right: 100 },
    verticalAlign: opts.va ?? VerticalAlign.TOP,
    columnSpan: opts.span ?? undefined,
  });

const tr = (cells: TableCell[]) => new TableRow({ children: cells });

const sectionDivDocx = (label: string, title: string) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [480, 8880],
    rows: [
      tr([
        tc(
          p(
            [t(label, { bold: true, size: 20, color: PALETTE.WHITE.hex })],
            { before: 0, after: 0 },
            AlignmentType.CENTER,
          ),
          480,
          {
            bord: NB(),
            bg: PALETTE.NAVY.hex,
            m: { top: 100, bottom: 100, left: 60, right: 60 },
            va: VerticalAlign.CENTER,
          },
        ),
        tc([p([t(title, { bold: true, size: 21, color: PALETTE.WHITE.hex })], { before: 0, after: 0 })], 8880, {
          bord: NB(),
          bg: "2E4470",
          m: { top: 100, bottom: 100, left: 180, right: 100 },
        }),
      ]),
    ],
  });

const subLabelDocx = (label: string, bgHex: string, colWidth = 9360) =>
  new Table({
    width: { size: colWidth, type: WidthType.DXA },
    columnWidths: [colWidth],
    rows: [
      tr([
        tc([p([t(label, { bold: true, size: 16, color: PALETTE.WHITE.hex })], { before: 0, after: 0 })], colWidth, {
          bord: NB(),
          bg: bgHex,
          m: { top: 60, bottom: 60, left: 120, right: 60 },
        }),
      ]),
    ],
  });

const bulletItemsDocx = (items: string[], color: string = PALETTE.DGRAY.hex, size = 18): Paragraph[] => {
  if (!items?.length) return [];
  return items.map(
    (item) =>
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [t(item, { size, color })],
        spacing: { before: 40, after: 40 },
      }),
  );
};

const pendingParaDocx = (msg = "To be completed by auditor.") =>
  p([t(msg, { size: 17, italic: true, color: PALETTE.MGRAY.hex })], { before: 60, after: 60 });

// =============================================================================
// 8. FINDING BLOCK — DOCX
// =============================================================================

function findingBlockDocx(f: Finding, idx: number): (Table | Paragraph)[] {
  const st = statusColorDocx(f.status);
  const rc = riskColorDocx(f.risk_level || "MEDIUM");
  const shade = idx % 2 === 0 ? PALETTE.WHITE.hex : PALETTE.LGRAY.hex;
  const wpRef = `WP-${String(idx + 1).padStart(2, "0")}`;

  return [
    // Header
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3600, 1680, 1880, 2200],
      rows: [
        tr([
          tc(
            [
              p([t(f.area, { bold: true, size: 20, color: PALETTE.NAVY.hex })], { before: 0, after: 20 }),
              p([t(wpRef, { size: 15, color: PALETTE.MGRAY.hex, italic: true })], { before: 0, after: 0 }),
            ],
            3600,
            { bg: shade },
          ),
          tc(
            [
              p([t("SIS / Std Reference", { size: 14, color: PALETTE.MGRAY.hex })], { before: 0, after: 20 }),
              p([t(f.reference || "N/A", { bold: true, size: 18, color: PALETTE.NAVY.hex })], { before: 0, after: 0 }),
            ],
            1680,
            { bg: shade },
          ),
          tc(
            [
              p([t("Inherent Risk (ASA 315)", { size: 14, color: PALETTE.MGRAY.hex })], { before: 0, after: 20 }),
              p([t((f.risk_level || "MEDIUM").toUpperCase(), { bold: true, size: 18, color: rc.text })], {
                before: 0,
                after: 0,
              }),
            ],
            1880,
            { bg: shade },
          ),
          tc(
            [
              p([t("Result", { size: 14, color: PALETTE.MGRAY.hex })], { before: 0, after: 20 }),
              p([t(st.label, { bold: true, size: 18, color: st.text })], { before: 0, after: 0 }),
            ],
            2200,
            { bg: shade },
          ),
        ]),
      ],
    }),

    // 1. Assertions
    subLabelDocx("1. ASSERTIONS TESTED (ASA 315)", PALETTE.NAVY.hex),
    ...(f.assertions?.length ? bulletItemsDocx(f.assertions) : [pendingParaDocx()]),

    // 2. Procedures
    subLabelDocx("2. PROCEDURES PERFORMED (ASA 330)", PALETTE.NAVY2.hex),
    ...(f.procedures?.length ? bulletItemsDocx(f.procedures) : [pendingParaDocx()]),

    // 3. Evidence
    subLabelDocx("3. EVIDENCE OBTAINED (ASA 500)", PALETTE.TEAL.hex),
    ...(f.evidence?.length ? bulletItemsDocx(f.evidence) : [pendingParaDocx()]),

    // 4. Exceptions
    subLabelDocx("4. EXCEPTIONS / DEVIATIONS (ASA 230 para 16)", PALETTE.RUST.hex),
    ...(f.exceptions?.length
      ? bulletItemsDocx(f.exceptions, PALETTE.RED.hex)
      : [
          p([t("No exceptions noted.", { size: 18, italic: true, color: PALETTE.GREEN.hex })], {
            before: 60,
            after: 60,
          }),
        ]),

    // 5. Conclusion + sign-off
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [7000, 2360],
      rows: [
        tr([
          tc(
            [
              p([t("5. AUDITOR CONCLUSION (ASA 230)", { size: 15, bold: true, color: PALETTE.MGRAY.hex })], {
                before: 0,
                after: 30,
              }),
              p([t(f.conclusion || "Pending auditor review.", { size: 18, italic: !f.conclusion })], {
                before: 0,
                after: 0,
              }),
            ],
            7000,
            { bg: st.bg, bord: BDR(st.text) },
          ),
          tc(
            [
              p([t("Auditor Sign-Off", { size: 14, color: PALETTE.MGRAY.hex })], { before: 0, after: 40 }),
              p([t(`Reviewed by: ${f.reviewed_by || "___________"}`, { size: 16 })], { before: 0, after: 30 }),
              p([t(`Date: ${f.reviewed_at || "__________"}`, { size: 16 })], { before: 0, after: 30 }),
              p([t("Initials: _______", { size: 16, color: PALETTE.MGRAY.hex })], { before: 0, after: 0 }),
            ],
            2360,
            { bg: PALETTE.WHITE.hex },
          ),
        ]),
      ],
    }),

    gapD(100),
  ];
}

// ── Draft blockers block — DOCX ───────────────────────────────────────────────

function draftBlockersDocx(gate: GateResult): (Table | Paragraph)[] {
  const items: (Table | Paragraph)[] = [
    sectionDivDocx("G", "File Incomplete — Cannot Be Signed  (ASA 230)"),
    gapD(120),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [
        tr([
          tc(
            [
              p(
                [
                  t("This file does not meet the ASA 230 reperformance test.", {
                    bold: true,
                    size: 19,
                    color: PALETTE.RED.hex,
                  }),
                ],
                { before: 0, after: 80 },
              ),
              p(
                [
                  t("The following items must be completed before this file can be signed:", {
                    size: 18,
                    color: PALETTE.DGRAY.hex,
                  }),
                ],
                { before: 0, after: 0 },
              ),
            ],
            9360,
            { bg: PALETTE.RED_BG.hex, bord: BDR(PALETTE.RED.hex) },
          ),
        ]),
      ],
    }),
    gapD(80),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [900, 2700, 5760],
      rows: [
        tr([
          tc(p([t("WP Ref", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 900, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
          tc(p([t("Area", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 2700, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
          tc(p([t("Issue", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 5760, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
        ]),
        ...gate.blockers.map((b, i) => {
          const bg = i % 2 === 0 ? PALETTE.RED_BG.hex : PALETTE.WHITE.hex;
          return tr([
            tc(p([t(b.wp_ref, { bold: true, size: 17, color: PALETTE.RED.hex })]), 900, { bg }),
            tc(p([t(b.area, { bold: true, size: 17 })]), 2700, { bg }),
            tc(p([t(b.issue, { size: 17 })]), 5760, { bg }),
          ]);
        }),
      ],
    }),
  ];
  return items;
}

// ── Signable sign-off — DOCX ──────────────────────────────────────────────────

function signOffDocx(): (Table | Paragraph)[] {
  return [
    sectionDivDocx("G", "Auditor Sign-Off  (ASA 230 / APES 110)"),
    gapD(140),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      rows: [
        tr([
          tc(
            [
              p([t("Auditor Declaration", { bold: true, size: 19, color: PALETTE.NAVY.hex })], {
                before: 0,
                after: 80,
              }),
              p([t("I confirm that I have:", { size: 18 })], { before: 0, after: 60 }),
              ...[
                "reviewed all working papers contained in this file",
                "obtained sufficient appropriate audit evidence for each area documented",
                "conducted this audit in accordance with ASAE 3100 and ASA 200-899",
                "complied with independence requirements under APES 110",
                "identified and assessed all contraventions per ACR criteria (s129/s130)",
                "formed the opinion expressed in Section F",
              ].map(
                (item) =>
                  new Paragraph({
                    numbering: { reference: "bullets", level: 0 },
                    children: [t(item, { size: 18 })],
                    spacing: { before: 40, after: 40 },
                  }),
              ),
              gapD(100),
              p([t("Name:  ___________________________________", { size: 18 })], { before: 0, after: 80 }),
              p([t("SMSF Auditor Number (SAN):  ______________", { size: 18 })], { before: 0, after: 80 }),
              p([t("Firm:  ____________________________________", { size: 18 })], { before: 0, after: 80 }),
              p([t("Date:  ____________________________________", { size: 18 })], { before: 0, after: 80 }),
              p([t("Signature:  _______________________________", { size: 18 })], { before: 0, after: 0 }),
            ],
            4680,
            { bg: PALETTE.BLUE_BG.hex },
          ),
          tc(
            [
              p([t("Retention Notice  (ASA 230)", { bold: true, size: 19, color: PALETTE.NAVY.hex })], {
                before: 0,
                after: 80,
              }),
              p(
                [
                  t(
                    "Working papers must be retained for a minimum of 7 years from the date of signing " +
                      "in accordance with ASIC requirements and ASA 230.",
                    { size: 17, italic: true, color: PALETTE.MGRAY.hex },
                  ),
                ],
                { before: 0, after: 80 },
              ),
              p(
                [
                  t(
                    "An experienced auditor with no prior connection to this engagement should be able to understand, " +
                      "from these working papers alone, the nature, timing and extent of audit procedures performed, " +
                      "evidence obtained, and conclusions reached (ASA 230 para 8).",
                    { size: 17, color: PALETTE.MGRAY.hex },
                  ),
                ],
                { before: 0, after: 0 },
              ),
            ],
            4680,
            { bg: PALETTE.LGRAY.hex },
          ),
        ]),
      ],
    }),
  ];
}

// ── Independence — DOCX ───────────────────────────────────────────────────────

function independenceDocx(ind: IndependencePayload): (Table | Paragraph)[] {
  if (!ind) return [pendingParaDocx("Independence assessment required before audit commences (APES 110).")];

  const threats: Array<{ key: keyof IndependencePayload["threats"]; label: string }> = [
    { key: "self_review", label: "Self-review" },
    { key: "self_interest", label: "Self-interest" },
    { key: "advocacy", label: "Advocacy" },
    { key: "familiarity", label: "Familiarity" },
    { key: "intimidation", label: "Intimidation" },
  ];

  const rows = threats.map((th, i) => {
    const ta = ind.threats[th.key];
    const bg = i % 2 === 0 ? PALETTE.WHITE.hex : PALETTE.LGRAY.hex;
    const lc =
      ta.level === "significant"
        ? PALETTE.RED.hex
        : ta.level === "moderate"
          ? PALETTE.ORANGE.hex
          : ta.level === "low"
            ? PALETTE.ORANGE.hex
            : PALETTE.GREEN.hex;
    return tr([
      tc(p([t(th.label, { bold: true, size: 17 })]), 1400, { bg }),
      tc(p([t(ta.level.toUpperCase(), { bold: true, size: 17, color: lc })]), 1000, { bg }),
      tc(p([t(ta.description, { size: 17 })]), 3760, { bg }),
      tc(p([t(ta.safeguards.join("; ") || "None required", { size: 17 })]), 3200, { bg }),
    ]);
  });

  return [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1400, 1000, 3760, 3200],
      rows: [
        tr([
          tc(p([t("Threat", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 1400, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
          tc(p([t("Level", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 1000, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
          tc(p([t("Assessment", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 3760, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
          tc(p([t("Safeguards", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 3200, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
        ]),
        ...rows,
      ],
    }),
    gapD(80),
    p([t(`Declaration: ${ind.declaration}`, { size: 18 })]),
    p([t(`Signed by: ${ind.signed_by || "___________"}   Date: ${ind.signed_date || "__________"}`, { size: 18 })]),
  ];
}

// ── Materiality — DOCX ───────────────────────────────────────────────────────

function materialityDocx(m: MaterialityPayload): (Table | Paragraph)[] {
  if (!m) return [pendingParaDocx("Materiality assessment required before audit commences (ASA 320).")];

  const rows = [
    [
      "Overall Materiality",
      m.benchmark.replace(/_/g, " "),
      `${m.overall_pct}%`,
      `$${m.overall.toLocaleString("en-AU")}`,
    ],
    ["Performance Materiality", "% of overall", `${m.performance_pct}%`, `$${m.performance.toLocaleString("en-AU")}`],
    ["Clearly Trivial", "% of overall", `${m.trivial_pct}%`, `$${m.trivial.toLocaleString("en-AU")}`],
  ];

  return [
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3200, 2400, 1000, 2760],
      rows: [
        tr([
          tc(p([t("Item", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 3200, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
          tc(p([t("Basis", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 2400, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
          tc(p([t("Pct", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 1000, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
          tc(p([t("Amount", { bold: true, size: 17, color: PALETTE.WHITE.hex })]), 2760, {
            bg: PALETTE.NAVY.hex,
            bord: BDR(PALETTE.NAVY.hex),
          }),
        ]),
        ...rows.map((r, i) => {
          const bg = i % 2 === 0 ? PALETTE.WHITE.hex : PALETTE.LGRAY.hex;
          return tr(
            r.map((cell, j) => tc(p([t(cell, { bold: j === 0, size: 18 })]), [3200, 2400, 1000, 2760][j], { bg })),
          );
        }),
      ],
    }),
    gapD(80),
    p([t(`Rationale: ${m.rationale}`, { size: 17, italic: true, color: PALETTE.MGRAY.hex })]),
  ];
}

// =============================================================================
// 9. WORKPAPER DOCX BUILDER
// =============================================================================

async function buildWorkpaperDocx(wp: WorkpaperPayload, fileBaseName: string): Promise<void> {
  const gate = gateFileForSignature(wp);
  const isDraft = !gate.ready;

  const { meta, opinion, materiality, independence, findings, deterministicBlock, contraventions, rfis } = wp;
  const opC = opinionColorDocx(opinion.overall ?? "");

  const partAFindings = findings.filter((f) => f.scope === "applicable" && (f.part === "A" || f.part === "both"));
  const partBFindings = findings.filter((f) => f.scope === "applicable" && (f.part === "B" || f.part === "both"));

  const children: any[] = [];

  // ── Draft banner ──────────────────────────────────────────────────────────
  if (isDraft) {
    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [
          tr([
            tc(
              [
                p(
                  [t("DRAFT — NOT FOR SIGNATURE", { bold: true, size: 24, color: PALETTE.RED.hex })],
                  { before: 0, after: 40 },
                  AlignmentType.CENTER,
                ),
                p(
                  [
                    t("Complete all working paper fields before signing Section G", {
                      size: 18,
                      color: PALETTE.DGRAY.hex,
                    }),
                  ],
                  { before: 0, after: 0 },
                  AlignmentType.CENTER,
                ),
              ],
              9360,
              { bg: PALETTE.RED_BG.hex, bord: BDR(PALETTE.RED.hex) },
            ),
          ]),
        ],
      }),
    );
    children.push(gapD(120));
  }

  // ── Cover ─────────────────────────────────────────────────────────────────
  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [
        tr([
          tc(
            [
              p(
                [t("AUDIT WORKING PAPERS", { bold: true, size: 40, color: PALETTE.WHITE.hex })],
                { before: 0, after: 80 },
                AlignmentType.CENTER,
              ),
              p([t(meta.fundName, { size: 28, color: "B8D4E8" })], { before: 0, after: 60 }, AlignmentType.CENTER),
              p(
                [t(`Year ended 30 June ${meta.financialYear}`, { size: 20, color: "8BADC4" })],
                { before: 0, after: 0 },
                AlignmentType.CENTER,
              ),
            ],
            9360,
            { bord: NB(), bg: PALETTE.NAVY.hex, m: { top: 280, bottom: 280, left: 300, right: 300 } },
          ),
        ]),
      ],
    }),
  );
  children.push(gapD(200));

  // Cover 2-col
  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [4680, 4680],
      rows: [
        tr([
          tc(
            [
              p([t("Fund Details", { bold: true, size: 19, color: PALETTE.NAVY.hex })], { before: 0, after: 100 }),
              p([t("ABN:  ", { bold: true, size: 18 }), t(meta.fundABN, { size: 18 })], { before: 0, after: 40 }),
              p(
                [
                  t("Financial Year:  ", { bold: true, size: 18 }),
                  t(`Year ended 30 June ${meta.financialYear}`, { size: 18 }),
                ],
                { before: 0, after: 40 },
              ),
              p([t("Prepared:  ", { bold: true, size: 18 }), t(meta.preparedDate, { size: 18 })], {
                before: 0,
                after: 40,
              }),
              p(
                [
                  t("Standard:  ", { bold: true, size: 18 }),
                  t(meta.standard || "ASA 230 / GS 009 / ASAE 3100", { size: 18 }),
                ],
                { before: 0, after: 0 },
              ),
            ],
            4680,
            { bg: PALETTE.BLUE_BG.hex },
          ),
          tc(
            [
              p([t("Audit Opinion Summary", { bold: true, size: 19, color: PALETTE.NAVY.hex })], {
                before: 0,
                after: 100,
              }),
              p(
                [
                  t("Overall:  ", { bold: true, size: 18 }),
                  t(opinion.overall.toUpperCase(), { bold: true, size: 18, color: opC.text }),
                ],
                { before: 0, after: 80 },
              ),
              p([t(opinion.reasoning || "Opinion pending.", { size: 17, italic: true, color: PALETTE.MGRAY.hex })], {
                before: 0,
                after: 0,
              }),
            ],
            4680,
            { bg: opC.bg, bord: BDR(opC.text) },
          ),
        ]),
      ],
    }),
  );

  // ── Independence ───────────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDivDocx("IND", "Independence Declaration  (APES 110)"));
  children.push(gapD(120));
  children.push(...independenceDocx(independence));

  // ── Materiality ────────────────────────────────────────────────────────────
  children.push(gapD(160));
  children.push(sectionDivDocx("MAT", "Materiality Assessment  (ASA 320)"));
  children.push(gapD(120));
  children.push(...materialityDocx(materiality));

  // ── Part A ─────────────────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDivDocx("A", "Part A — Financial Audit Working Papers  (ASA 330 / GS 009 Part A)"));
  children.push(gapD(120));
  children.push(
    p(
      [
        t("Objective: ", { bold: true, size: 17 }),
        t(
          "Obtain sufficient appropriate audit evidence to form an opinion on the financial report (ASA 500). " +
            "Each area documents assertions tested, procedures performed, evidence obtained, exceptions, and the " +
            "auditor's conclusion to satisfy the reperformance test under ASA 230 para 8.",
          { size: 17, italic: true, color: PALETTE.MGRAY.hex },
        ),
      ],
      { before: 0, after: 120 },
    ),
  );

  if (!partAFindings.length) {
    children.push(
      p([t("No Part A findings recorded.", { size: 18, italic: true, color: PALETTE.MGRAY.hex })], {
        before: 0,
        after: 0,
      }),
    );
  } else {
    for (let i = 0; i < partAFindings.length; i++) {
      children.push(...findingBlockDocx(partAFindings[i], i));
    }
  }

  // ── Part B ─────────────────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDivDocx("B", "Part B — Compliance Engagement Working Papers  (ASAE 3100 / GS 009 Part B)"));
  children.push(gapD(120));
  children.push(
    p(
      [
        t("Objective: ", { bold: true, size: 17 }),
        t(
          "Obtain sufficient appropriate evidence to conclude on compliance with SISA/SISR provisions specified " +
            "in NAT 11466. Each area documents the specific provision tested, procedures performed, evidence obtained, " +
            "any deviations, and the auditor's conclusion.",
          { size: 17, italic: true, color: PALETTE.MGRAY.hex },
        ),
      ],
      { before: 0, after: 120 },
    ),
  );

  if (!partBFindings.length) {
    children.push(
      p([t("No Part B findings recorded.", { size: 18, italic: true, color: PALETTE.MGRAY.hex })], {
        before: 0,
        after: 0,
      }),
    );
  } else {
    for (let i = 0; i < partBFindings.length; i++) {
      children.push(...findingBlockDocx(partBFindings[i], i));
    }
  }

  // ── Section C — Deterministic ───────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDivDocx("C", "Deterministic Checks — Code Verified"));
  children.push(gapD(100));
  children.push(
    p(
      [
        t("Results computed arithmetically. Do not override with AI assessment.", {
          size: 17,
          italic: true,
          color: PALETTE.MGRAY.hex,
        }),
      ],
      { before: 0, after: 120 },
    ),
  );

  for (const line of deterministicBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(gapD(40));
      continue;
    }
    const isBold = /PASS|FAIL|BREACH|MATERIALITY/.test(trimmed);
    children.push(
      p(
        [
          t(trimmed, {
            size: 18,
            bold: isBold,
            color: /BREACH|FAIL/.test(trimmed) ? PALETTE.RED.hex : PALETTE.DGRAY.hex,
          }),
        ],
        { before: 0, after: 40 },
      ),
    );
  }

  // ── Section D — Contraventions ─────────────────────────────────────────────
  children.push(gapD(160));
  children.push(sectionDivDocx("D", "Contraventions Register  (s129/s130 SISA)"));
  children.push(gapD(100));

  if (!contraventions.length) {
    children.push(
      p([t("No contraventions identified.", { size: 18, italic: true, color: PALETTE.GREEN.hex })], {
        before: 0,
        after: 0,
      }),
    );
  } else {
    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [400, 1400, 1600, 1200, 4760],
        rows: [
          tr(
            [
              ["#", 400],
              ["SIS Section", 1400],
              ["Area", 1600],
              ["Severity", 1200],
              ["Details", 4760],
            ].map(([h, w]) =>
              tc(p([t(h as string, { bold: true, size: 17, color: PALETTE.WHITE.hex })]), w as number, {
                bord: BDR(PALETTE.NAVY.hex),
                bg: PALETTE.NAVY.hex,
                m: { top: 60, bottom: 60, left: 100, right: 60 },
              }),
            ),
          ),
          ...contraventions.map((c, i) => {
            const bg = i % 2 === 0 ? PALETTE.WHITE.hex : PALETTE.LGRAY.hex;
            const sev = c.severity === "material" ? PALETTE.RED.hex : PALETTE.ORANGE.hex;
            return tr([
              tc(p([t(`${i + 1}`, { bold: true, size: 18 })]), 400, { bg }),
              tc(p([t(c.section, { size: 17, bold: true, color: PALETTE.NAVY.hex })]), 1400, { bg }),
              tc(p([t(c.area, { size: 17 })]), 1600, { bg }),
              tc(p([t(c.severity.toUpperCase(), { bold: true, size: 17, color: sev })]), 1200, { bg }),
              tc(p([t(c.description, { size: 17 })]), 4760, { bg }),
            ]);
          }),
        ],
      }),
    );
  }

  // ── Section E — RFIs ───────────────────────────────────────────────────────
  children.push(gapD(160));
  children.push(sectionDivDocx("E", "Requests for Information (RFIs)"));
  children.push(gapD(100));

  if (!rfis.length) {
    children.push(
      p([t("No RFIs raised.", { size: 18, italic: true, color: PALETTE.GREEN.hex })], { before: 0, after: 0 }),
    );
  } else {
    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [400, 900, 4860, 1800, 1400],
        rows: [
          tr(
            [
              ["#", 400],
              ["Priority", 900],
              ["Request", 4860],
              ["Title", 1800],
              ["Status", 1400],
            ].map(([h, w]) =>
              tc(p([t(h as string, { bold: true, size: 17, color: PALETTE.WHITE.hex })]), w as number, {
                bord: BDR(PALETTE.NAVY.hex),
                bg: PALETTE.NAVY.hex,
                m: { top: 60, bottom: 60, left: 100, right: 60 },
              }),
            ),
          ),
          ...rfis.map((r, i) => {
            const bg = i % 2 === 0 ? PALETTE.WHITE.hex : PALETTE.LGRAY.hex;
            const pc =
              r.priority === "HIGH"
                ? PALETTE.RED.hex
                : r.priority === "MEDIUM"
                  ? PALETTE.ORANGE.hex
                  : PALETTE.MGRAY.hex;
            const stC = r.status === "RESOLVED" ? PALETTE.GREEN.hex : PALETTE.ORANGE.hex;
            return tr([
              tc(p([t(`${i + 1}`, { bold: true, size: 18 })]), 400, { bg }),
              tc(p([t(r.priority, { bold: true, size: 17, color: pc })]), 900, { bg }),
              tc(p([t(r.description, { size: 17 })]), 4860, { bg }),
              tc(p([t(r.title, { bold: true, size: 17, color: PALETTE.NAVY.hex })]), 1800, { bg }),
              tc(p([t(r.status, { bold: true, size: 17, color: stC })]), 1400, { bg }),
            ]);
          }),
        ],
      }),
    );
  }

  // ── Section F — Opinion ────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(sectionDivDocx("F", "Audit Opinion  (NAT 11466)"));
  children.push(gapD(140));
  children.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [9360],
      rows: [
        tr([
          tc(
            [
              p(
                [
                  t("Overall Opinion:  ", { bold: true, size: 21 }),
                  t(opinion.overall.toUpperCase(), { bold: true, size: 21, color: opC.text }),
                ],
                { before: 0, after: 100 },
              ),
              p([t(opinion.reasoning || "Opinion reasoning pending.", { size: 18 })], { before: 0, after: 0 }),
            ],
            9360,
            { bg: opC.bg, bord: BDR(opC.text) },
          ),
        ]),
      ],
    }),
  );

  // ── Section G ─────────────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()] }));
  if (isDraft) {
    children.push(...draftBlockersDocx(gate));
  } else {
    children.push(...signOffDocx());
  }

  // ── Build document ─────────────────────────────────────────────────────────
  const docx = new Document({
    styles: {
      default: { document: { run: { font: "Times New Roman", size: 20, color: PALETTE.DGRAY.hex } } },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "-",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 480, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Table({
                width: { size: 9360, type: WidthType.DXA },
                columnWidths: [6500, 2860],
                rows: [
                  tr([
                    tc(
                      [
                        p([t("Audit Working Papers", { bold: true, size: 18, color: PALETTE.NAVY.hex })], {
                          before: 0,
                          after: 20,
                        }),
                        p(
                          [
                            t(
                              `${meta.fundName}  |  ABN ${meta.fundABN}  |  Year ended 30 June ${meta.financialYear}  |  ${meta.standard || "ASA 230 / GS 009"}`,
                              { size: 15, color: PALETTE.MGRAY.hex },
                            ),
                          ],
                          { before: 0, after: 0 },
                        ),
                      ],
                      6500,
                      { bord: NB() },
                    ),
                    tc(
                      [
                        p(
                          [
                            t(isDraft ? "DRAFT — NOT FOR SIGNATURE" : "CONFIDENTIAL", {
                              bold: true,
                              size: 14,
                              color: isDraft ? PALETTE.RED.hex : PALETTE.RED.hex,
                            }),
                          ],
                          { before: 0, after: 0 },
                          AlignmentType.RIGHT,
                        ),
                      ],
                      2860,
                      { bord: NB(), va: VerticalAlign.CENTER },
                    ),
                  ]),
                ],
              }),
              hRule(PALETTE.NAVY.hex, 8),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              hRule(PALETTE.BORDER.hex, 4),
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
                children: [
                  t(`${meta.fundName} — Audit Working Papers FY${meta.financialYear}`, {
                    size: 14,
                    color: PALETTE.MGRAY.hex,
                  }),
                  new TextRun({ text: "\t", size: 14 }),
                  t("Prepared by registered SMSF auditor", { size: 14, color: PALETTE.MGRAY.hex }),
                  new TextRun({ text: "   Page ", size: 14, color: PALETTE.MGRAY.hex }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 14,
                    font: "Times New Roman",
                    color: PALETTE.MGRAY.hex,
                  }),
                  new TextRun({ text: " of ", size: 14, color: PALETTE.MGRAY.hex }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 14,
                    font: "Times New Roman",
                    color: PALETTE.MGRAY.hex,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(docx);
  saveAs(buffer, `${fileBaseName}.docx`);
}

// =============================================================================
// 10. GENERIC TEXT RENDERERS (plain-text document types)
// =============================================================================

function buildGenericPdf(content: string, fundName: string, fileBaseName: string): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  const pageW = doc.internal.pageSize.getWidth() - margin * 2;
  const pageH = doc.internal.pageSize.getHeight();
  let y = margin;

  const checkPage = (lineH: number) => {
    if (y + lineH > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      y += 4;
      checkPage(0);
      continue;
    }

    if (/^[-]{3,}$/.test(trimmed)) {
      checkPage(5);
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + pageW, y);
      y += 5;
      continue;
    }

    const isHeading =
      trimmed.length >= 4 &&
      trimmed === trimmed.toUpperCase() &&
      /[A-Z]/.test(trimmed) &&
      !trimmed.includes("|") &&
      trimmed.length < 80;

    if (isHeading) {
      y += 3;
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...PALETTE.NAVY.rgb);
      for (const wl of doc.splitTextToSize(trimmed, pageW)) {
        checkPage(6);
        doc.text(wl, margin, y);
        y += 6;
      }
      y += 1;
      continue;
    }

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...PALETTE.DGRAY.rgb);
    for (const wl of doc.splitTextToSize(trimmed, pageW)) {
      checkPage(5);
      doc.text(wl, margin, y);
      y += 5;
    }
    y += 1;
  }

  const pc = doc.getNumberOfPages();
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    const fy = pageH - 10;
    doc.setFontSize(8);
    doc.setTextColor(...PALETTE.MGRAY.rgb);
    doc.setFont("times", "normal");
    doc.text(fundName, margin, fy);
    doc.text(`Page ${i} of ${pc}`, doc.internal.pageSize.getWidth() - margin, fy, { align: "right" });
  }

  doc.save(`${fileBaseName}.pdf`);
}

async function buildGenericDocx(content: string, fileBaseName: string): Promise<void> {
  const lines = content.split("\n");
  const children: (Paragraph | Table)[] = [];

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      continue;
    }
    if (/^[-]{3,}$/.test(trimmed)) {
      children.push(
        new Paragraph({
          children: [],
          spacing: { before: 0, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: PALETTE.BORDER.hex, space: 1 } },
        }),
      );
      continue;
    }

    const isHeading =
      trimmed.length >= 4 &&
      trimmed === trimmed.toUpperCase() &&
      /[A-Z]/.test(trimmed) &&
      !trimmed.includes("|") &&
      trimmed.length < 80;

    if (isHeading) {
      children.push(
        new Paragraph({
          spacing: { before: 280, after: 120 },
          children: [
            new TextRun({ text: trimmed, bold: true, font: "Times New Roman", size: 22, color: PALETTE.NAVY.hex }),
          ],
        }),
      );
      continue;
    }

    children.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: raw, font: "Times New Roman", size: 20, color: PALETTE.DGRAY.hex })],
      }),
    );
  }

  const docx = new Document({
    styles: { default: { document: { run: { font: "Times New Roman", size: 20, color: PALETTE.DGRAY.hex } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(docx);
  saveAs(buffer, `${fileBaseName}.docx`);
}
