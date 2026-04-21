// =============================================================================
// report-generator.ts
// SMSF Audit Report Generator
//
// Complies with:
//   ASA 230  Audit Documentation
//   ASA 300  Planning an Audit of a Financial Report
//   ASA 315  Identifying and Assessing Risks
//   ASA 320  Materiality in Planning and Performing an Audit
//   ASA 402  Auditing Considerations Relating to an Entity Using a Service Organisation
//   ASA 500  Audit Evidence
//   ASA 706  Emphasis of Matter Paragraphs
//   GS 009   Auditing Self-Managed Superannuation Funds
//   ASAE 3100 Compliance Engagements
//   APES 110 Code of Ethics for Professional Accountants
// =============================================================================

// =============================================================================
// 1. PALETTE — single source of truth for both PDF and DOCX
// =============================================================================

export const PALETTE = {
  NAVY:     { rgb: [28,  43,  69]  as [number,number,number], hex: "1C2B45" },
  DGRAY:    { rgb: [51,  51,  51]  as [number,number,number], hex: "333333" },
  MGRAY:    { rgb: [102, 102, 102] as [number,number,number], hex: "666666" },
  LGRAY:    { rgb: [242, 242, 242] as [number,number,number], hex: "F2F2F2" },
  BGRAY:    { rgb: [220, 220, 220] as [number,number,number], hex: "DCDCDC" },
  BORDER:   { rgb: [204, 204, 204] as [number,number,number], hex: "CCCCCC" },
  WHITE:    { rgb: [255, 255, 255] as [number,number,number], hex: "FFFFFF" },
  GREEN:    { rgb: [26,  92,  53]  as [number,number,number], hex: "1A5C35" },
  GREEN_BG: { rgb: [234, 242, 236] as [number,number,number], hex: "EAF2EC" },
  ORANGE:   { rgb: [123, 63,  0]   as [number,number,number], hex: "7B3F00" },
  ORN_BG:   { rgb: [253, 243, 231] as [number,number,number], hex: "FDF3E7" },
  RED:      { rgb: [123, 17,  17]  as [number,number,number], hex: "7B1111" },
  RED_BG:   { rgb: [253, 240, 240] as [number,number,number], hex: "FDF0F0" },
  BLUE:     { rgb: [26,  58,  107] as [number,number,number], hex: "1A3A6B" },
  BLUE_BG:  { rgb: [237, 242, 250] as [number,number,number], hex: "EDF2FA" },
  AMBER_BG: { rgb: [255, 248, 220] as [number,number,number], hex: "FFFBDC" },
  NAVY2:    { rgb: [68,  92,  138] as [number,number,number], hex: "445C8A" },
  TEAL:     { rgb: [50,  107, 80]  as [number,number,number], hex: "326B50" },
  RUST:     { rgb: [150, 80,  30]  as [number,number,number], hex: "96501E" },
} as const;

// =============================================================================
// 2. TYPES — full discriminated-union payload system
// =============================================================================

// ── APES 110 threat levels ────────────────────────────────────────────────────

export type ThreatLevel = "none" | "low" | "moderate" | "significant";

export interface ThreatAssessment {
  level: ThreatLevel;
  description: string;
  safeguards: string[];
}

export interface IndependencePayload {
  threats: {
    self_review:   ThreatAssessment;
    self_interest: ThreatAssessment;
    advocacy:      ThreatAssessment;
    familiarity:   ThreatAssessment;
    intimidation:  ThreatAssessment;
  };
  safeguards_applied: string[];
  declaration: string;
  signed_by:   string;
  signed_date: string; // ISO date string
}

// ── ASA 320 materiality ───────────────────────────────────────────────────────

export type MaterialityBenchmark =
  | "total_assets"
  | "net_assets"
  | "member_benefits"
  | "revenue"
  | "gross_income";

export interface MaterialityPayload {
  benchmark:        MaterialityBenchmark;
  benchmark_value:  number;
  overall_pct:      number;
  overall:          number;
  performance_pct:  number;
  performance:      number;
  trivial_pct:      number;
  trivial:          number;
  rationale:        string;
}

// ── ACR / contravention ───────────────────────────────────────────────────────

export interface ACRAssessment {
  contravention_area:      string;
  sis_section:             string;
  amount:                  number;
  meets_reporting_criteria: boolean;
  applicable_tests:        string[];
  details:                 string;
}

// ── Core Finding type ─────────────────────────────────────────────────────────

export type FindingStatus =
  | "pass"
  | "fail"
  | "needs_info"
  | "pass_with_review"
  | "refer_to_auditor"
  | "not_applicable";

export type FindingPart  = "A" | "B" | "both";
export type FindingScope = "applicable" | "not_applicable";
export type RiskLevel    = "HIGH" | "MEDIUM" | "LOW";

export interface Finding {
  area:       string;
  status:     FindingStatus;
  part:       FindingPart;   // MANDATORY — caller sets, renderer does not infer
  scope:      FindingScope;  // MANDATORY — caller sets, renderer does not infer
  reference:  string;
  risk_level: RiskLevel;

  // ASA 230 six-part structure — all mandatory for a signable file
  assertions: string[];
  procedures: string[];
  evidence:   string[];
  exceptions: string[];
  conclusion: string;

  // Auditor review sign-off
  reviewed_by?: string;
  reviewed_at?: string; // ISO date string
}

// ── Workpaper payload (top-level) ─────────────────────────────────────────────

export interface WorkpaperPayload {
  meta: {
    fundName:      string;
    fundABN:       string;
    financialYear: string; // exactly 4 digits, e.g. "2025"
    preparedDate:  string;
    standard:      string;
  };
  independence: IndependencePayload;
  materiality:  MaterialityPayload;
  opinion: {
    overall:        string;
    reasoning:      string;
    part_a_opinion: "unqualified" | "qualified" | "adverse";
    part_b_opinion: "unqualified" | "qualified" | "adverse";
    part_a_basis:   string[];
    part_b_basis:   string[];
  };
  findings:       Finding[];
  deterministicBlock: string;
  contraventions: Array<{
    area:        string;
    section:     string;
    severity:    "immaterial" | "material" | "serious";
    description: string;
  }>;
  rfis: Array<{
    priority:    "HIGH" | "MEDIUM" | "LOW";
    title:       string;
    description: string;
    status:      "OPEN" | "RESOLVED" | "PENDING";
  }>;
}

// ── Engagement letter payload ─────────────────────────────────────────────────

export interface EngagementLetterPayload {
  fundName:        string;
  financialYear:   string;
  trusteeNames:    string[];
  accountantName:  string;
  auditorName:     string;
  auditorSAN:      string;
}

// ── Representation letter payload ─────────────────────────────────────────────

export interface RepLetterPayload {
  fundName:      string;
  financialYear: string;
  auditorName:   string;
  trusteeNames:  string[];
}

// ── IAR payload ───────────────────────────────────────────────────────────────

export interface IARPayload {
  fundName:          string;
  fundABN:           string;
  financialYear:     string;
  opinion:           WorkpaperPayload["opinion"];
  emphasisOfMatter:  string[];
}

// ── Management letter payload ─────────────────────────────────────────────────

export interface ManagementLetterPayload {
  fundName:      string;
  financialYear: string;
  findings:      Array<{ area: string; status: string; conclusion: string; part?: string }>;
  contraventions: Array<{ area: string; section?: string; description?: string }>;
  rfis:          Array<{ title: string; description: string; priority: string }>;
  s129Notice:    string;
}

// ── s129 notice payload ───────────────────────────────────────────────────────

export interface S129NoticePayload {
  fundName:       string;
  financialYear:  string;
  contraventions: Array<{
    area:        string;
    section?:    string;
    description?: string;
    amount?:     string;
    severity?:   string;
  }>;
  acrAssessments: ACRAssessment[];
}

// ── Planning memo payload ─────────────────────────────────────────────────────

export interface PlanningMemoPayload {
  fundName:           string;
  fundABN:            string;
  financialYear:      string;
  fundProfile:        FundProfile;
  materiality:        MaterialityPayload | null;
  classifications:    Array<{ category: string; file_name: string; confidence: string }>;
  detectedCustodians: string[];
}

// ── FundProfile ───────────────────────────────────────────────────────────────

export interface FundProfile {
  corporate_trustee:             boolean;
  member_count:                  number;
  total_assets?:                 number;
  complexity?:                   string;
  has_pension:                   boolean;
  has_property:                  boolean;
  has_lrba:                      boolean;
  has_crypto:                    boolean;
  has_death_benefit:             boolean;
  has_related_party_transactions: boolean;
  has_unlisted_investments:      boolean;
  has_platform_investments:      boolean;
  has_international_investments: boolean;
  fund_establishment_date?:      string;
  prior_year_contraventions?:    string[];
  members?:                      Array<{
    name:         string;
    account_type: string;
    dob?:         string;
  }>;
}

// ── Discriminated union for all report types ──────────────────────────────────

export type ReportPayload =
  | { kind: "workpaper";         data: WorkpaperPayload }
  | { kind: "engagement_letter"; data: EngagementLetterPayload }
  | { kind: "rep_letter";        data: RepLetterPayload }
  | { kind: "iar";               data: IARPayload }
  | { kind: "management_letter"; data: ManagementLetterPayload }
  | { kind: "s129_notice";       data: S129NoticePayload }
  | { kind: "planning_memo";     data: PlanningMemoPayload };

// =============================================================================
// 3. INPUT VALIDATION
// =============================================================================

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(`Validation error [${field}]: ${message}`);
    this.name = "ValidationError";
  }
}

/**
 * Validates the meta block of a workpaper payload at the system boundary.
 * Throws ValidationError with field name if invalid.
 */
export function validateWorkpaperMeta(meta: WorkpaperPayload["meta"]): void {
  if (!meta.fundName?.trim()) {
    throw new ValidationError("meta.fundName", "Fund name is required");
  }
  if (!/^\d{11}$/.test(meta.fundABN?.replace(/\s/g, "") ?? "") && meta.fundABN !== "N/A") {
    throw new ValidationError("meta.fundABN", `ABN must be 11 digits or "N/A", got: "${meta.fundABN}"`);
  }
  if (!/^\d{4}$/.test(meta.financialYear ?? "")) {
    throw new ValidationError("meta.financialYear", `financialYear must be exactly 4 digits (e.g. "2025"), got: "${meta.financialYear}"`);
  }
}

export function validateEngagementLetterMeta(data: EngagementLetterPayload): void {
  if (!/^\d{4}$/.test(data.financialYear ?? "")) {
    throw new ValidationError("financialYear", `Must be exactly 4 digits, got: "${data.financialYear}"`);
  }
  if (!data.fundName?.trim()) {
    throw new ValidationError("fundName", "Fund name is required");
  }
  if (!data.trusteeNames?.length) {
    throw new ValidationError("trusteeNames", "At least one trustee name is required");
  }
}

export function validateRepLetterMeta(data: RepLetterPayload): void {
  if (!/^\d{4}$/.test(data.financialYear ?? "")) {
    throw new ValidationError("financialYear", `Must be exactly 4 digits, got: "${data.financialYear}"`);
  }
  if (!data.fundName?.trim()) {
    throw new ValidationError("fundName", "Fund name is required");
  }
}

// =============================================================================
// 4. GATE — determines whether a file is ready for signature
// =============================================================================

export interface GateBlocker {
  wp_ref:    string;
  area:      string;
  issue:     string;
}

export interface GateResult {
  ready:    boolean;
  blockers: GateBlocker[];
}

/**
 * ASA 230 reperformance gate.
 * Returns { ready: true } only when every finding has non-empty procedures,
 * evidence, and assertions; materiality is defined; and independence is declared.
 *
 * The renderer calls this before deciding between SIGNABLE and DRAFT mode.
 * Callers may also call this directly before attempting to render.
 */
export function gateFileForSignature(payload: WorkpaperPayload): GateResult {
  const blockers: GateBlocker[] = [];
  const applicableFindings = payload.findings.filter(f => f.scope === "applicable");

  applicableFindings.forEach((f, i) => {
    const ref = `WP-${String(i + 1).padStart(2, "0")}`;
    if (!f.assertions?.length) {
      blockers.push({ wp_ref: ref, area: f.area, issue: "assertions[] is empty — ASA 315 not satisfied" });
    }
    if (!f.procedures?.length) {
      blockers.push({ wp_ref: ref, area: f.area, issue: "procedures[] is empty — ASA 230 reperformance test not satisfied" });
    }
    if (!f.evidence?.length) {
      blockers.push({ wp_ref: ref, area: f.area, issue: "evidence[] is empty — ASA 500 not satisfied" });
    }
    if (!f.conclusion?.trim()) {
      blockers.push({ wp_ref: ref, area: f.area, issue: "conclusion is empty — ASA 230 not satisfied" });
    }
    if (!f.risk_level) {
      blockers.push({ wp_ref: ref, area: f.area, issue: "risk_level is not set — ASA 315 not satisfied" });
    }
  });

  // Materiality gate
  if (!payload.materiality) {
    blockers.push({ wp_ref: "PLAN", area: "Materiality", issue: "Materiality payload is missing — ASA 320 not satisfied" });
  } else {
    if (!payload.materiality.rationale?.trim()) {
      blockers.push({ wp_ref: "PLAN", area: "Materiality", issue: "Materiality rationale is empty — ASA 320 para 14 not satisfied" });
    }
  }

  // Independence gate
  if (!payload.independence) {
    blockers.push({ wp_ref: "IND", area: "Independence", issue: "Independence payload is missing — APES 110 not satisfied" });
  } else {
    if (!payload.independence.declaration?.trim()) {
      blockers.push({ wp_ref: "IND", area: "Independence", issue: "Independence declaration is empty — APES 110 not satisfied" });
    }
    if (!payload.independence.signed_by?.trim()) {
      blockers.push({ wp_ref: "IND", area: "Independence", issue: "Independence not signed — APES 110 not satisfied" });
    }
  }

  return { ready: blockers.length === 0, blockers };
}

// =============================================================================
// 5. ACR REPORTING — s129/s130 SISA
// =============================================================================

// Per se reportable sections and regulations — exact normalised strings.
// Normalised = whitespace stripped, lowercase.
const ALWAYS_REPORTABLE_NORMALISED = new Set<string>([
  "s17a", "s62", "s65", "s66", "s67", "s67a", "s67b",
  "s82", "s83", "s84", "s85", "s103", "s104", "s104a",
  "s105", "s109", "s126k",
  "reg1.06(9a)", "reg4.09", "reg4.09a", "reg5.03", "reg5.08",
  "reg6.17", "reg7.04", "reg8.02b",
  "reg13.12", "reg13.13", "reg13.14", "reg13.18aa",
]);

/** Normalise a SIS reference string for set lookup. */
function normaliseSection(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/** Returns true if the exact normalised section is per-se reportable. */
function isAlwaysReportable(section: string): boolean {
  return ALWAYS_REPORTABLE_NORMALISED.has(normaliseSection(section));
}

export function assessACRRequirements(
  contraventions: Array<{
    area:         string;
    section?:     string;
    amount?:      number;
    severity?:    string;
    description?: string;
  }>,
  fundProfile: {
    total_assets?:              number;
    fund_establishment_date?:   string;
    prior_year_contraventions?: string[];
  }
): ACRAssessment[] {
  if (!contraventions?.length) return [];

  const totalAssets = fundProfile.total_assets ?? 0;
  const totalContraventionValue = contraventions.reduce(
    (sum, c) => sum + (Number(c.amount) ?? 0), 0
  );

  let isNewFund = false;
  if (fundProfile.fund_establishment_date) {
    const estDate = new Date(fundProfile.fund_establishment_date);
    if (!isNaN(estDate.getTime())) {
      // Use proper calendar-month diff, not millisecond approximation
      const now      = new Date();
      const months   =
        (now.getFullYear()  - estDate.getFullYear())  * 12 +
        (now.getMonth()     - estDate.getMonth());
      isNewFund = months < 15;
    }
  }

  return contraventions.map(c => {
    const amount  = Number(c.amount) ?? 0;
    const section = c.section ?? "";
    const tests:    string[] = [];
    let reportable = false;

    // Test 1: SMSF definition breach (s17A)
    if (normaliseSection(section) === "s17a") {
      tests.push("Test 1: SMSF definition breach (s17A) — always reportable");
      reportable = true;
    }
    // Test 2: New fund (<15 months) and contravention >$2,000
    if (isNewFund && amount > 2_000) {
      tests.push("Test 2: New fund (<15 months old), contravention value >$2,000");
      reportable = true;
    }
    // Test 3: Repeat contravention after prior written advice
    if (fundProfile.prior_year_contraventions?.some(pc =>
      normaliseSection(pc) === normaliseSection(section)
    )) {
      tests.push("Test 3: Repeat contravention of same provision after prior written advice");
      reportable = true;
    }
    // Test 4: Total contraventions >$30,000
    if (totalContraventionValue > 30_000) {
      tests.push("Test 4: Total contravention value >$30,000");
      reportable = true;
    }
    // Test 5: Single contravention >5% of total assets
    if (totalAssets > 0 && amount > totalAssets * 0.05) {
      tests.push(`Test 5: Contravention >5% of total assets ($${Math.round(totalAssets * 0.05).toLocaleString("en-AU")})`);
      reportable = true;
    }
    // Test 6: Per se reportable provision
    if (isAlwaysReportable(section)) {
      tests.push(`Test 6: Provision (${section}) is per se reportable under SISA s129/s130`);
      reportable = true;
    }

    return {
      contravention_area:       c.area,
      sis_section:              section,
      amount,
      meets_reporting_criteria: reportable,
      applicable_tests:         tests,
      details:                  c.description ?? "",
    };
  });
}

// =============================================================================
// 6. GENERATORS — all return typed payloads or plain strings (no magic prefix)
// =============================================================================

// ── s129 Notice ───────────────────────────────────────────────────────────────

export function generateS129Notice(data: S129NoticePayload): string {
  const { fundName, financialYear, contraventions, acrAssessments } = data;
  if (!contraventions?.length) return "";

  const lines: string[] = [
    `NOTICE UNDER SECTION 129 OF THE SUPERANNUATION INDUSTRY (SUPERVISION) ACT 1993`,
    ``,
    `To the Trustees of ${fundName}`,
    ``,
    `In accordance with section 129 of the Superannuation Industry (Supervision) Act 1993 (SISA), ` +
    `we are required to report to you in writing any contraventions of the SISA or Superannuation ` +
    `Industry (Supervision) Regulations 1994 (SISR) identified during our audit of the Fund for the ` +
    `financial year ended 30 June ${financialYear}.`,
    ``,
    `We have identified the following contraventions:`,
    ``,
  ];

  for (let i = 0; i < contraventions.length; i++) {
    const c   = contraventions[i];
    const acr = acrAssessments.find(a => a.contravention_area === c.area);
    lines.push(`${i + 1}. ${c.area}`);
    lines.push(`   SIS Reference: ${c.section ?? "See details"}`);
    if (c.amount) lines.push(`   Amount: $${c.amount}`);
    lines.push(`   Severity: ${c.severity ?? "material"}`);
    lines.push(`   Details: ${c.description ?? ""}`);
    if (acr?.meets_reporting_criteria) {
      lines.push(
        `   ACR Status: This contravention meets the ATO reporting criteria and will be ` +
        `reported in the Auditor Contravention Report (ACR) within 28 days of completing this audit.`
      );
      lines.push(`   Applicable tests: ${acr.applicable_tests.join("; ")}`);
    } else {
      lines.push(
        `   ACR Status: This contravention does not meet the ATO reporting criteria. No ACR lodgement required for this item.`
      );
    }
    lines.push(``);
  }

  lines.push(
    `Trustees are advised to take immediate action to rectify the above contraventions. ` +
    `Failure to do so may result in further regulatory action by the ATO, including the imposition ` +
    `of administrative penalties or the fund losing its complying status.`
  );
  lines.push(``);
  lines.push(`We recommend trustees seek professional advice regarding the rectification of the above matters.`);

  return lines.join("\n");
}

// ── Management Letter ─────────────────────────────────────────────────────────

export function generateManagementLetterContent(data: ManagementLetterPayload): string {
  const { fundName, financialYear, findings, contraventions, rfis, s129Notice } = data;
  const lines: string[] = [
    `MANAGEMENT LETTER`,
    ``,
    `To the Trustees of ${fundName}`,
    ``,
    `We have completed our audit of ${fundName} for the year ended 30 June ${financialYear}. ` +
    `This letter communicates matters arising from our audit that we believe are of significance to the trustees.`,
    ``,
  ];

  if (contraventions.length > 0) {
    lines.push(`CONTRAVENTIONS IDENTIFIED`);
    lines.push(
      `The following contraventions of the SISA and/or SISR were identified during the audit. ` +
      `A formal notice under section 129 of the SISA is attached.`
    );
    lines.push(``);
    for (const c of contraventions) {
      lines.push(`- ${c.area} (${c.section ?? "SIS Act"}): ${c.description ?? ""}`);
    }
    lines.push(``);
  }

  const attentionItems = findings.filter(f =>
    ["needs_info", "pass_with_review", "refer_to_auditor"].includes(f.status)
  );
  if (attentionItems.length > 0) {
    lines.push(`MATTERS REQUIRING ATTENTION`);
    lines.push(``);
    for (const f of attentionItems) {
      lines.push(`- ${f.area} (${f.status}): ${f.conclusion}`);
    }
    lines.push(``);
  }

  const openRfis = rfis.filter(r => r.priority === "HIGH" || r.priority === "MEDIUM");
  if (openRfis.length > 0) {
    lines.push(`OUTSTANDING INFORMATION REQUESTS`);
    lines.push(``);
    for (const r of openRfis) {
      lines.push(`- [${r.priority}] ${r.title}: ${r.description}`);
    }
    lines.push(``);
  }

  lines.push(`RECOMMENDATIONS`);
  lines.push(
    `We recommend the trustees address the above matters as soon as practicable. ` +
    `In particular, any contraventions should be rectified to avoid potential regulatory action by the ATO.`
  );
  lines.push(``);
  lines.push(
    `Should you have any queries regarding this letter or any other aspect of the audit, ` +
    `please do not hesitate to contact us.`
  );
  lines.push(``);
  lines.push(`Yours faithfully,`);

  if (s129Notice) {
    lines.push(``);
    lines.push(`ATTACHMENT — SECTION 129 NOTICE`);
    lines.push(s129Notice);
  }

  return lines.join("\n");
}

// ── IAR (NAT 11466) ───────────────────────────────────────────────────────────

export function generateIARContent(data: IARPayload): string {
  const { fundName, fundABN, financialYear, opinion, emphasisOfMatter } = data;

  const lines: string[] = [
    `SELF-MANAGED SUPERANNUATION FUND`,
    `INDEPENDENT AUDITOR'S REPORT`,
    `(NAT 11466)`,
    ``,
    `Fund Name: ${fundName}`,
    `ABN: ${fundABN || "N/A"}`,
    `Financial Year: Year ended 30 June ${financialYear}`,
    ``,
    `---------------------------------------------------`,
    `PART A — FINANCIAL AUDIT (s35C(1) SISA)`,
    `---------------------------------------------------`,
    ``,
  ];

  const opA = opinion.part_a_opinion;
  if (opA === "unqualified") {
    lines.push(`Opinion`);
    lines.push(
      `In our opinion, the financial report of ${fundName} presents fairly, in all material respects, ` +
      `the financial position of the Fund as at 30 June ${financialYear}, and the results of its ` +
      `operations for the year then ended, in accordance with the accounting policies adopted by the Fund.`
    );
  } else if (opA === "qualified") {
    lines.push(`Qualified Opinion`);
    lines.push(
      `In our opinion, except for the possible effects of the matter(s) described in the Basis for ` +
      `Qualified Opinion paragraph, the financial report of ${fundName} presents fairly, in all material ` +
      `respects, the financial position of the Fund as at 30 June ${financialYear}.`
    );
    if (opinion.part_a_basis?.length) {
      lines.push(``);
      lines.push(`Basis for Qualified Opinion`);
      for (const b of opinion.part_a_basis) lines.push(`- ${b}`);
    }
  } else {
    lines.push(`Adverse Opinion`);
    lines.push(
      `In our opinion, due to the significance of the matter(s) described in the Basis for Adverse ` +
      `Opinion paragraph, the financial report of ${fundName} does not present fairly the financial ` +
      `position of the Fund as at 30 June ${financialYear}.`
    );
    if (opinion.part_a_basis?.length) {
      lines.push(``);
      lines.push(`Basis for Adverse Opinion`);
      for (const b of opinion.part_a_basis) lines.push(`- ${b}`);
    }
  }

  // Emphasis of Matter — after opinion, before Part B, per ASA 706
  if (emphasisOfMatter?.length) {
    lines.push(``);
    lines.push(`Emphasis of Matter`);
    lines.push(`Without qualifying our opinion, we draw attention to the following matters:`);
    for (const e of emphasisOfMatter) lines.push(`- ${e}`);
  }

  lines.push(``);
  lines.push(`---------------------------------------------------`);
  lines.push(`PART B — COMPLIANCE ENGAGEMENT (s35C(2) SISA)`);
  lines.push(`---------------------------------------------------`);
  lines.push(``);

  const opB = opinion.part_b_opinion;
  if (opB === "unqualified") {
    lines.push(`Opinion`);
    lines.push(
      `In our opinion, ${fundName} has complied, in all material respects, with the requirements of the ` +
      `Superannuation Industry (Supervision) Act 1993 and Superannuation Industry (Supervision) Regulations ` +
      `1994 as specified in the approved form auditor's report for the year ended 30 June ${financialYear}.`
    );
  } else if (opB === "qualified") {
    lines.push(`Qualified Opinion`);
    lines.push(
      `In our opinion, except for the matter(s) described in the Basis for Qualified Opinion paragraph, ` +
      `${fundName} has complied, in all material respects, with the requirements of the SISA and SISR for ` +
      `the year ended 30 June ${financialYear}.`
    );
    if (opinion.part_b_basis?.length) {
      lines.push(``);
      lines.push(`Basis for Qualified Opinion`);
      for (const b of opinion.part_b_basis) lines.push(`- ${b}`);
    }
  } else {
    lines.push(`Adverse Opinion`);
    lines.push(
      `In our opinion, due to the significance of the matter(s) described below, ${fundName} has not ` +
      `complied with the requirements of the SISA and SISR for the year ended 30 June ${financialYear}.`
    );
    if (opinion.part_b_basis?.length) {
      lines.push(``);
      lines.push(`Basis for Adverse Opinion`);
      for (const b of opinion.part_b_basis) lines.push(`- ${b}`);
    }
  }

  lines.push(``);
  lines.push(`Auditor's Responsibilities`);
  lines.push(
    `Our audit was conducted in accordance with Australian Auditing Standards and Standards on Assurance ` +
    `Engagements issued by the Auditing and Assurance Standards Board (AUASB). We are independent of the ` +
    `Fund in accordance with the ethical requirements of APES 110 Code of Ethics for Professional Accountants.`
  );
  lines.push(``);
  lines.push(`[Auditor Name]`);
  lines.push(`[SMSF Auditor Number]`);
  lines.push(`[Date]`);

  return lines.join("\n");
}

// ── Engagement Letter ─────────────────────────────────────────────────────────

export function generateEngagementLetterContent(data: EngagementLetterPayload): string {
  validateEngagementLetterMeta(data);
  const { fundName, financialYear, trusteeNames, accountantName, auditorName, auditorSAN } = data;

  const sigBlocks = trusteeNames
    .map(name =>
      `...........................................\t........................................... Date:\n${name}\t\t\t\t\t\tSignature`
    )
    .join("\n\n");

  return `ENGAGEMENT LETTER FOR THE AUDIT OF ${fundName}

To the Trustees of ${fundName}

THE OBJECTIVE AND SCOPE OF THE AUDIT

You have requested that we audit ${fundName} (Fund) for the year ended 30 June ${financialYear}, for the purposes of:

1. Expressing an opinion as to whether the financial report, in all material respects, is presented fairly in accordance with the accounting policies adopted by the Fund (Part A — Financial Audit); and

2. Expressing an opinion as to whether the Fund complied, in all material respects, with the relevant requirements of the Superannuation Industry (Supervision) Act 1993 (SISA) and Superannuation Industry (Supervision) Regulations 1994 (SISR) as specified in the approved form auditor's report (Part B — Compliance Engagement).

We are pleased to confirm our acceptance and understanding of this engagement by means of this letter.

THE RESPONSIBILITIES OF THE AUDITOR

We will conduct our financial audit in accordance with Australian Auditing Standards and our compliance engagement in accordance with applicable Standards on Assurance Engagements, issued by the Auditing and Assurance Standards Board (AUASB). These standards require that we comply with relevant ethical requirements, including those pertaining to independence under APES 110.

In accordance with section 35C of the SISA, we are required to provide the trustees of the Fund with an auditor's report in the approved form (NAT 11466) within 28 days after the trustees have provided all documents relevant to the preparation of the auditor's report (SISR reg 8.03).

FINANCIAL AUDIT

A financial audit involves performing audit procedures to obtain audit evidence about the amounts and disclosures in the financial report. The procedures selected depend on the auditor's judgement, including the assessment of the risks of material misstatement of the financial report, whether due to fraud or error. Due to the inherent limitations of an audit, there is an unavoidable risk that some material misstatements may remain undiscovered.

COMPLIANCE ENGAGEMENT

A compliance engagement involves performing assurance procedures to obtain evidence about the Fund's compliance with the provisions of the SISA and SISR as specified in the ATO's approved form auditor's report.

THE RESPONSIBILITIES OF THE TRUSTEES

The trustees are responsible for the preparation and fair presentation of the financial report and for ensuring the Fund's compliance with the SISA and SISR. This responsibility includes:

- Establishing and maintaining controls relevant to the preparation of a financial report that is free from material misstatement, whether due to fraud or error.
- Selecting and applying appropriate accounting policies.
- Making accounting estimates that are reasonable in the circumstances.
- Making available to us all books of the Fund, including registers, minutes and other relevant papers of all trustee meetings, and giving us any information, explanations and assistance we require. Section 35C(2) of SISA requires trustees to provide any requested document within 14 days of the auditor's request.

ACCOUNTANT/ADMINISTRATOR AS AGENT

In the event the financial reports are prepared by an external accountant or administrator, the Trustees of the Fund hereby authorise ${accountantName || "___________"} to act on the Fund's behalf to answer any audit queries.

INDEPENDENCE

We confirm that, to the best of our knowledge and belief, the engagement team and others in the firm, as appropriate, have complied with relevant ethical requirements regarding independence under APES 110.

FEES

Audit fees will be billed separately in accordance with time spent and will be due and payable within 30 days of issuing the invoice.

CONTRAVENTION REPORTING

In the event that during the conduct of our audit a contravention of the SISA or SISR is identified, as approved SMSF auditors we are required to report this to the ATO and to the Trustees under sections 129 and 130 of the SISA.

INCOME TAX ASSESSMENT ACT 1997 — SECTION 295.550

We do not express an opinion as to whether the Fund has complied with Section 295.550 of the Income Tax Assessment Act 1997. Trustees should seek professional advice from a registered tax agent with respect to the Fund's compliance with non-arm's length income (NALI) and non-arm's length expenses (NALE).

LIMITATION OF LIABILITY

As a practitioner participating in a scheme approved under Professional Standards Legislation, our liability may be limited under the scheme.

This letter will be effective for future years' audits unless we advise you of its amendment or replacement, or the engagement concludes. Annual confirmation of acceptance will be recorded in the audit file each year.

Yours faithfully,

${auditorName || "[Auditor Name]"}
SMSF Auditor Number: ${auditorSAN || "[SAN]"}

Acknowledged on behalf of the trustees of ${fundName}:

${sigBlocks}`;
}

// ── Representation Letter ─────────────────────────────────────────────────────

export function generateRepLetterContent(data: RepLetterPayload): string {
  validateRepLetterMeta(data);
  const { fundName, financialYear, auditorName, trusteeNames } = data;

  const priorYear = String(parseInt(financialYear, 10) - 1);
  const fyStart   = `1 July ${priorYear}`;
  const fyEnd     = `30 June ${financialYear}`;

  const sigBlocks = trusteeNames
    .map(name =>
      `...........................................\t........................................... Date:\n${name}\t\t\t\t\t\tSignature`
    )
    .join("\n\n");

  return `Dear Sir/Madam,

TRUSTEE REPRESENTATION LETTER

From: The Trustee(s) of ${fundName}
To:   ${auditorName || "___________"}

This representation letter is provided in connection with your audit of the financial reports of ${fundName} (the Fund) and the Fund's compliance with the Superannuation Industry (Supervision) Act 1993 (SISA) and SIS Regulations (SISR) for the period ${fyStart} to ${fyEnd}, for the purpose of you expressing an opinion as to whether the financial report is, in all material respects, presented fairly in accordance with the accounting policies adopted by the Fund, and whether the Fund complied, in all material respects, with the relevant requirements of SISA and SISR.

We confirm, to the best of our knowledge and belief, the following representations made to you during your audit:

SOLE PURPOSE TEST
The Fund is maintained for the sole purpose of providing benefits for each member on their retirement, death, termination of employment or ill-health. (s62 SISA)

TRUSTEES ARE NOT DISQUALIFIED
No person (including a director of a corporate trustee) who currently acts or acted as trustee or director of a corporate trustee was, or is, a disqualified person within the meaning of SISA. (s126K SISA)

FUND DEFINITION AND TRUSTEE CONDUCT
The Fund meets the definition of a self-managed superannuation fund under SISA, including that no member is an employee of another member (unless relatives), and no trustee or director of the corporate trustee receives any remuneration for duties performed in relation to the Fund. (s17A SISA)

The Fund has been conducted in accordance with its governing rules and trustee covenants at all times during the year, and there were no amendments to the governing rules during the year except as notified to you. (s52 SISA)

The trustees have complied with all trustee requirements of the SISA and SISR during the year ended ${fyEnd}. (ASAE 3100)

The Fund has complied with the requirements of the SISA and SISR as specified in the approved form auditor's report (NAT 11466), including sections 17A, 35AE, 35B, 35C(2), 62, 65, 66, 67, 67A, 67B, 82-85, 103, 104, 104A, 105, 109 and 126K of the SISA, and regulations 1.06(9A), 4.09, 4.09A, 5.03, 5.08, 6.17, 7.04, 8.02B, 13.12, 13.13, 13.14 and 13.18AA of the SISR.

All contributions accepted and benefits paid have been in accordance with the governing rules of the Fund and relevant provisions of the SISA and SISR. (reg 7.04 | reg 6.17 SISR)

INVESTMENT STRATEGY
An investment strategy is in place and has been regularly reviewed during the year, having regard to risk, return, liquidity, diversification and the insurance needs of Fund members. The assets of the Fund have been invested in accordance with the investment strategy at all times during the year. (reg 4.09 SISR)

ASSET FORM AND VALUATION
We have approved the financial report. (ASA 580)
Investments are carried at market value. We consider the valuations in the financial report to be reasonable in light of present circumstances. (reg 8.02B SISR)

ACCOUNTING POLICIES
All significant accounting policies of the Fund are adequately described in the financial report. We acknowledge our responsibility for ensuring the financial report is in accordance with the accounting policies selected by us and the requirements of the SISA and SISR. (ASA 580)

FUND BOOKS AND RECORDS
All transactions have been recorded in the accounting records and are reflected in the financial report. We have made available to you all financial records, related data, information, explanations and assistance necessary for the conduct of the audit, and minutes of all trustee meetings. (ASA 580)

We have disclosed to you all information in relation to fraud or suspected fraud that we are aware of and that affects the Fund.

Information retention obligations have been complied with, including:
- Accounting records and financial reports: 5 years (s35AE SISA)
- Minutes and records of trustee meetings: 10 years (s103 SISA)
- Records of trustee changes and consents: 10 years (s104 SISA)
- Copies of all member/beneficiary reports: 10 years (s105 SISA)
- Trustee declarations (NAT 71089) for all trustees appointed after 30 June 2007: retained (s104A SISA)

SAFEGUARDING ASSETS
Authorised signatories on bank and investment accounts are regularly reviewed. Tangible assets are, where appropriate, adequately insured and appropriately stored. (reg 13.18AA SISR)

UNCORRECTED MISSTATEMENTS
We believe the effects of any uncorrected financial report misstatements accumulated by the auditor during the audit are immaterial, both individually and in aggregate, to the financial report taken as a whole. (ASA 450)

OWNERSHIP AND PLEDGING OF ASSETS
The Fund has satisfactory title to all assets appearing in the statement of financial position. There are no liens or encumbrances on any assets or benefits, and no assets have been pledged or assigned to secure liabilities of others. All assets are acquired, maintained and disposed of on an arm's length basis. (reg 13.12 | reg 13.13 | reg 13.14 | s109 SISA)

RELATED PARTIES
We have disclosed to you the identity of the Fund's related parties and all related party transactions and relationships. The Fund has not made any loans or provided financial assistance to members of the Fund or their relatives. (s82-s85 | s65 SISA)

BORROWINGS
The Fund has not borrowed money or maintained any borrowings during the period, with the exception of borrowings allowable under SISA. (s67 SISA)

SUBSEQUENT EVENTS
Any events or transactions that occurred since the date of the financial report, or are pending, which would have a significant adverse effect on the Fund's financial position, have been communicated to the auditor. (ASA 560)

OUTSTANDING LEGAL ACTION
We confirm you have been advised of all significant legal matters, and that all known actual or possible litigation and claims have been adequately accounted for and disclosed in the financial report. (ASA 250 | ASA 502)

There have been no communications from the ATO concerning a contravention of the SISA or SISR which has occurred, is occurring, or is about to occur.

GOING CONCERN
We confirm we have no knowledge of any events or conditions that would cast significant doubt on the Fund's ability to continue as a going concern. (s130 SISA)

Yours faithfully,
${fundName}

I/We, trustee(s)/director(s) of the corporate trustee of ${fundName} confirm the above representations:

${sigBlocks}`;
}

// ── Audit Planning Memorandum ─────────────────────────────────────────────────

// Provision registry — each entry describes a testable area, its part, and when it applies.
// Adding a new provision type only requires adding it here.
interface ProvisionEntry {
  area:       string;
  risk:       "HIGH" | "MEDIUM" | "LOW";
  reason:     string;
  applies:    (fp: FundProfile) => boolean;
}

const PROVISION_REGISTRY: ProvisionEntry[] = [
  { area: "Property holdings",          risk: "HIGH",   reason: "Fund holds property — independent valuation per reg 8.02B, lease verification, arm's length under s109",             applies: fp => fp.has_property },
  { area: "LRBA",                        risk: "HIGH",   reason: "Limited recourse borrowing arrangement — safe harbour compliance s67A, NALI risk under ITAA97 s295-465",             applies: fp => fp.has_lrba },
  { area: "Digital assets",             risk: "HIGH",   reason: "Cryptocurrency holdings — custody verification, midnight AEST valuation per reg 8.02B, investment strategy coverage", applies: fp => fp.has_crypto },
  { area: "Death benefits",             risk: "HIGH",   reason: "Death benefit distribution — BDBN validity, beneficiary eligibility, tax components",                                  applies: fp => fp.has_death_benefit },
  { area: "Related party transactions", risk: "HIGH",   reason: "Related party transactions — arm's length verification s109, financial assistance prohibition s65",                  applies: fp => fp.has_related_party_transactions },
  { area: "Pension / TBAR",             risk: "MEDIUM", reason: "Fund in pension phase — minimum drawdown reg 1.06(9A), transfer balance account reporting obligations",              applies: fp => fp.has_pension },
  { area: "Unlisted investments",       risk: "MEDIUM", reason: "Unlisted investment holdings — independent valuation evidence, recoverability assessment per reg 8.02B",             applies: fp => fp.has_unlisted_investments },
  { area: "Platform / custodial",       risk: "MEDIUM", reason: "GS007/ASAE 3402 service organisation assurance required — without current report Part A qualification is mandatory", applies: fp => fp.has_platform_investments },
  { area: "International investments",  risk: "LOW",    reason: "Overseas investments — withholding tax treatment, foreign tax offset verification",                                   applies: fp => fp.has_international_investments },
  { area: "General compliance",         risk: "LOW",    reason: "Standard fund profile — sole purpose, investment strategy, trustee obligations are low inherent risk",               applies: fp => !fp.has_property && !fp.has_lrba && !fp.has_crypto },
];

const BASE_SCOPE: string[] = [
  "Financial statement verification (Statement of Financial Position, Operating Statement, Member Accounts)",
  "Cash and bank balance reconciliation to bank statements",
  "Investment existence, ownership and valuation at 30 June",
  "Contribution cap compliance — concessional and non-concessional (ITAA97 s291, s292)",
  "Sole purpose test (SISA s62)",
  "Investment strategy compliance (SISR reg 4.09)",
  "Trust deed and governing rules compliance",
  "Trustee obligations — minutes, declarations, record-keeping (s103, s104, s104A)",
  "Arm's length dealings (s109)",
  "In-house asset ratio (s82–s85)",
  "ATO registration and lodgement obligations",
];

const CONDITIONAL_SCOPE: Array<{ item: string; applies: (fp: FundProfile) => boolean }> = [
  { item: "Pension minimum drawdown compliance (SISR reg 1.06(9A))",             applies: fp => fp.has_pension },
  { item: "Transfer balance account reporting (TBAR) and TBC compliance",        applies: fp => fp.has_pension },
  { item: "Property valuation — independent evidence of market value (reg 8.02B)", applies: fp => fp.has_property },
  { item: "Lease agreement verification and rental income completeness",          applies: fp => fp.has_property },
  { item: "LRBA safe harbour compliance and arm's length terms (s67A)",           applies: fp => fp.has_lrba },
  { item: "Digital asset custody documentation and midnight AEST valuation",      applies: fp => fp.has_crypto },
  { item: "Corporate trustee — ASIC registration, director eligibility (s17A)",  applies: fp => fp.corporate_trustee },
];

export function generateAuditPlanningMemo(data: PlanningMemoPayload): string {
  const { fundName, fundABN, financialYear, fundProfile: fp, materiality, classifications, detectedCustodians } = data;

  const risks = PROVISION_REGISTRY.filter(p => p.applies(fp));
  const scope = [
    ...BASE_SCOPE,
    ...CONDITIONAL_SCOPE.filter(s => s.applies(fp)).map(s => s.item),
    ...(detectedCustodians.length > 0
      ? [`Service organisation assurance (GS007/ASAE 3402) — platforms: ${detectedCustodians.join(", ")}`]
      : []),
  ];

  const docCategories = new Map<string, string[]>();
  for (const c of classifications) {
    if (!docCategories.has(c.category)) docCategories.set(c.category, []);
    docCategories.get(c.category)!.push(c.file_name);
  }

  const members = fp.members ?? [];

  return `AUDIT PLANNING MEMORANDUM

Fund: ${fundName}
ABN: ${fundABN || "N/A"}
Financial Year: Year ended 30 June ${financialYear}
Date of Planning: ${new Date().toLocaleDateString("en-AU")}
Standards applied: ASA 300 Planning an Audit of a Financial Report / ASAE 3100

---------------------------------------------------
1. FUND OVERVIEW
---------------------------------------------------

Fund Name: ${fundName}
ABN: ${fundABN || "N/A"}
Trustee Structure: ${fp.corporate_trustee ? "Corporate Trustee" : "Individual Trustee(s)"}
Number of Members: ${fp.member_count || members.length}
Fund Complexity: ${fp.complexity || "standard"}
Total Assets: ${fp.total_assets ? "$" + Number(fp.total_assets).toLocaleString("en-AU") : "To be determined from financial statements"}

Members:
${members.map((m, i) => `  ${i + 1}. ${m.name || "Unknown"} — ${m.account_type || "accumulation"} phase${m.dob ? " (DOB: " + m.dob + ")" : ""}`).join("\n") || "  No member details provided."}

Fund Characteristics:
  Pension phase:               ${fp.has_pension ? "Yes" : "No"}
  Property holdings:           ${fp.has_property ? "Yes" : "No"}
  LRBA:                        ${fp.has_lrba ? "Yes" : "No"}
  Digital assets:              ${fp.has_crypto ? "Yes" : "No"}
  Unlisted investments:        ${fp.has_unlisted_investments ? "Yes" : "No"}
  Platform investments:        ${fp.has_platform_investments ? "Yes" : "No"}
  International investments:   ${fp.has_international_investments ? "Yes" : "No"}
  Related party transactions:  ${fp.has_related_party_transactions ? "Yes" : "No"}

---------------------------------------------------
2. MATERIALITY (ASA 320)
---------------------------------------------------

${materiality
  ? `Benchmark: ${materiality.benchmark.replace(/_/g, " ")} — $${materiality.benchmark_value.toLocaleString("en-AU")}
Rationale: ${materiality.rationale}

Overall Materiality    (${materiality.overall_pct}% of benchmark):   $${materiality.overall.toLocaleString("en-AU")}
Performance Materiality (${materiality.performance_pct}% of overall):   $${materiality.performance.toLocaleString("en-AU")}
Clearly Trivial Threshold (${materiality.trivial_pct}% of overall): $${materiality.trivial.toLocaleString("en-AU")}

Misstatements and differences below $${materiality.trivial.toLocaleString("en-AU")} will not be accumulated for reporting unless indicative of fraud or systematic error.`
  : "Materiality to be calculated once total assets are confirmed from financial statements. File CANNOT be signed until this section is completed."}

---------------------------------------------------
3. INDEPENDENCE AND ENGAGEMENT ACCEPTANCE (APES 110 / ASA 210)
---------------------------------------------------

Independence confirmed: Engagement team has no financial interest, personal relationship, or other impairment that would compromise independence with respect to ${fundName}.
Engagement letter signed: [Date — required before audit commences]
Trustee representation letter requested: Yes
Prior year auditor: [To be completed]

---------------------------------------------------
4. RISK ASSESSMENT (ASA 315)
---------------------------------------------------

${risks.map(r => `[${r.risk}] ${r.area}\n  ${r.reason}`).join("\n\n")}

---------------------------------------------------
5. AUDIT SCOPE
---------------------------------------------------

The following areas will be tested as part of this engagement:

${scope.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}

Standards applied:
  - ASA 200-899 (Australian Auditing Standards) — Part A Financial Audit
  - ASAE 3100 (Compliance Engagements) — Part B Compliance Engagement
  - GS 009 (Auditing Self-Managed Superannuation Funds) — guidance

---------------------------------------------------
6. DOCUMENTS RECEIVED
---------------------------------------------------

Total documents received: ${classifications.length}

${Array.from(docCategories.entries()).map(([cat, files]) => `${cat} (${files.length}):\n${files.map(f => "  - " + f).join("\n")}`).join("\n\n") || "No documents classified."}

---------------------------------------------------
7. KEY AUDIT APPROACH
---------------------------------------------------

Financial Audit (Part A — ASA 330):
  - Verify all material balances in the Statement of Financial Position
  - Reconcile bank and investment balances to independent source documents
  - Verify investment existence, ownership and market value at 30 June ${financialYear}
  - Review operating statement for completeness and accuracy
  - Assess adequacy of disclosures in notes to financial statements

Compliance Engagement (Part B — ASAE 3100 / GS 009):
  - Test all provisions specified in NAT 11466 approved form
  - Verify contribution caps against ATO records and member notices
  - Assess investment strategy currency, signature and adherence
  - Review trustee minutes, declarations and record-keeping obligations
  - Test for prohibited transactions (loans to members s65, related party s109)
  - In-house assets ratio calculation and trend analysis

${detectedCustodians.length > 0
  ? `Service Organisation Assurance (ASA 402 / GS007):
  Platforms/custodians detected: ${detectedCustodians.join(", ")}
  Current GS007/ASAE 3402 report required for each platform.
  If GS007 report not obtained or not current: Part A opinion MUST be qualified.`
  : ""}

[Auditor Name]
[SMSF Auditor Number]
[Date]`;
}

// ── Workpaper JSON payload builder ────────────────────────────────────────────

/**
 * Builds a typed WorkpaperPayload from raw inputs.
 * Validates meta at the boundary. Part/scope/risk_level must be provided
 * by the caller — this function does NOT infer them.
 */
export function buildWorkpaperPayload(
  fundName:           string,
  fundABN:            string,
  financialYear:      string,
  independence:       IndependencePayload,
  materiality:        MaterialityPayload,
  findings:           Finding[],
  contraventions:     WorkpaperPayload["contraventions"],
  deterministicBlock: string,
  rfis:               WorkpaperPayload["rfis"],
  opinion:            WorkpaperPayload["opinion"]
): WorkpaperPayload {
  const meta = {
    fundName,
    fundABN: fundABN || "N/A",
    financialYear,
    preparedDate: new Date().toLocaleDateString("en-AU"),
    standard:     "ASA 230 / GS 009 / ASAE 3100",
  };

  validateWorkpaperMeta(meta);

  return {
    meta,
    independence,
    materiality,
    opinion,
    findings,
    deterministicBlock: deterministicBlock || "No deterministic checks recorded.",
    contraventions:     contraventions ?? [],
    rfis:               rfis ?? [],
  };
}
