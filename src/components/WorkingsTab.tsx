import { useMemo, useState } from "react";
import { ChevronDown, AlertCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WorkingsTabProps {
  aiFindings: any;
  documentCount?: number;
  findingsCompletedAt?: string | null;
  onRunAudit?: () => void;
}

const fmtMoney = (v: any) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString()}`;
};

const fmtPct = (v: any) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!isFinite(n)) return "—";
  // If looks like a fraction (<=1), convert to %
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
};

const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
};

const titleCase = (s?: string) => {
  if (!s) return "—";
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
};

const firstNonNull = (...vals: any[]) => vals.find((v) => v != null && v !== "");

function Card({
  title,
  children,
  muted = false,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  muted?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const headerBorder = muted ? "border-t-border" : "border-t-foreground";
  const wrapper = `rounded-lg border border-border ${muted ? "bg-muted/20" : "bg-background"} border-t-2 ${headerBorder}`;

  if (!collapsible) {
    return (
      <section className={wrapper}>
        <header className="px-5 pt-4 pb-2">
          <h3 className={`text-sm font-semibold tracking-tight ${muted ? "text-muted-foreground" : "text-foreground"}`}>
            {title}
          </h3>
        </header>
        <div className="px-5 pb-5">{children}</div>
      </section>
    );
  }

  return (
    <section className={wrapper}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 pt-4 pb-3 text-left"
      >
        <h3 className={`text-sm font-semibold tracking-tight ${muted ? "text-muted-foreground" : "text-foreground"}`}>
          {title}
        </h3>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

function MutedCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function ReRunCallout() {
  return <MutedCallout>Data not available — re-run the audit to generate this working paper.</MutedCallout>;
}

function StatusBadge({ pass, passLabel = "PASS", failLabel = "FAIL" }: { pass: boolean | null; passLabel?: string; failLabel?: string }) {
  if (pass === null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant={pass ? "pass" : "fail"} className="text-[10px] tracking-wide font-semibold px-2 py-0.5">
      {pass ? passLabel : failLabel}
    </Badge>
  );
}

function ConfidenceDot({ value }: { value?: string }) {
  const v = (value || "").toLowerCase();
  let color = "bg-muted-foreground/40";
  let label = v || "—";
  if (v === "high") color = "bg-status-pass";
  else if (v === "medium") { color = "bg-status-flag"; }
  else if (v === "low") color = "bg-status-fail";
  else if (v === "conflict") { color = "bg-status-flag"; label = "uncertain"; }
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs capitalize text-foreground/80">{label}</span>
    </span>
  );
}

function KVTable({ rows }: { rows: { label: string; value: React.ReactNode; bold?: boolean }[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i > 0 ? "border-t border-border" : ""}>
              <td className="bg-muted/30 px-4 py-2.5 text-xs uppercase tracking-wide text-muted-foreground w-1/2 align-middle">
                {r.label}
              </td>
              <td className={`px-4 py-2.5 text-foreground tabular-nums ${r.bold ? "font-semibold" : ""}`}>
                {r.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-border">
              {cells.map((c, j) => (
                <td key={j} className="px-4 py-2.5 align-middle text-foreground/90 tabular-nums">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function humanizeCorrection(c: any): string {
  if (!c) return "";
  if (typeof c === "string") return c;
  if (typeof c === "object") {
    const parts: string[] = [];
    const msg = c.message ?? c.description ?? c.detail ?? c.note;
    const field = c.field ?? c.path ?? c.key;
    const from = c.from ?? c.previous ?? c.old;
    const to = c.to ?? c.new ?? c.value;
    if (field) parts.push(String(field));
    if (from !== undefined && to !== undefined) parts.push(`changed from ${from} to ${to}`);
    if (msg) parts.push(String(msg));
    if (parts.length) return parts.join(" — ");
  }
  return "Correction applied";
}

export function WorkingsTab({ aiFindings, documentCount, findingsCompletedAt, onRunAudit }: WorkingsTabProps) {
  const data = useMemo(() => {
    if (!aiFindings) return null;
    if (typeof aiFindings === "string") {
      try { return JSON.parse(aiFindings); } catch { return null; }
    }
    return aiFindings;
  }, [aiFindings]);

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center space-y-3">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">No workings available yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Run the audit to generate materiality, contribution caps, pension, ATO and in-house asset workings.
          </p>
        </div>
        {onRunAudit && (
          <button
            onClick={onRunAudit}
            className="text-xs font-medium underline text-foreground hover:text-foreground/80"
          >
            Run audit
          </button>
        )}
      </div>
    );
  }

  const det = data?._deterministic ?? {};
  const ing = data?._ingestion ?? {};
  const w = data?._workings ?? {};

  // 1. Materiality
  const mat = data?._materiality ?? det?.materiality ?? null;
  const matBasis = firstNonNull(mat?.basis, mat?.benchmark);
  const matBaseFigure = firstNonNull(mat?.base_figure, mat?.benchmark_value, mat?.total_assets, mat?.net_assets);
  const matPctRaw = firstNonNull(mat?.percentage, mat?.percent, mat?.rate);
  const matThreshold = firstNonNull(mat?.threshold, mat?.overall, mat?.materiality);

  // 2. Contribution caps
  const contribData: any[] = Array.isArray(w?.contribution_caps) ? w.contribution_caps : [];

  // 3. Pension drawdown
  const pensionData: any[] = Array.isArray(w?.pension_workings) ? w.pension_workings : [];

  // 4. ATO obligations
  const atoSummary = w?.ato_summary ?? null;
  const atoAccounts: any[] = Array.isArray(atoSummary?.accounts) ? atoSummary.accounts : [];
  const atoTotalDebt = Number(atoSummary?.total_debt ?? 0);

  // 5. In-house assets
  const ih = w?.in_house_assets ?? null;
  const ihRelated = ih ? ih?.total_in_house : null;
  const ihTotal = ih ? ih?.total_assets : null;
  let ihPct: number | null = null;
  if (ih) {
    const explicit = ih?.percentage;
    if (explicit != null) ihPct = Number(explicit) <= 1 ? Number(explicit) * 100 : Number(explicit);
    else if (ihRelated != null && ihTotal != null && Number(ihTotal) > 0) {
      ihPct = (Number(ihRelated) / Number(ihTotal)) * 100;
    }
  }
  const ihPass = ih?.status ? String(ih.status).toLowerCase() === "pass" : (ihPct == null ? null : ihPct < 5);

  // 6. Evidence register
  const classifications: any[] = Array.isArray(ing?.classifications) ? ing.classifications : [];

  // 7. System workings
  const corrections: any[] = Array.isArray(data?._corrections) ? data._corrections : [];
  const version = data?._version ?? "—";

  return (
    <div className="space-y-4">
      {/* 1. Materiality */}
      <Card title="Materiality Calculation">
        {!mat ? (
          <MutedCallout>
            Materiality could not be calculated — ensure financial statements are uploaded and re-run the audit.
          </MutedCallout>
        ) : (
          <KVTable
            rows={[
              { label: "Basis", value: matBasis ? titleCase(String(matBasis)) : "—" },
              { label: "Base Figure", value: fmtMoney(matBaseFigure) },
              { label: "Materiality %", value: fmtPct(matPctRaw ?? (matThreshold && matBaseFigure ? Number(matThreshold) / Number(matBaseFigure) : null)) },
              { label: "Materiality Threshold", value: fmtMoney(matThreshold), bold: true },
            ]}
          />
        )}
      </Card>

      {/* 2. Contribution Caps */}
      <Card title="Contribution Caps — Member Summary">
        {!contribData || contribData.length === 0 ? (
          <MutedCallout>No contribution data extracted.</MutedCallout>
        ) : (
          <DataTable
            headers={["Member", "Concessional", "CC Cap", "Non-Concessional", "NCC Cap", "Status"]}
            rows={contribData.map((m: any) => {
              const cc = Number(m?.cc_amount ?? 0);
              const ccCap = Number(m?.cc_cap ?? 0);
              const ncc = Number(m?.ncc_amount ?? 0);
              const nccCap = Number(m?.ncc_cap ?? 0);
              const ccPass = m?.cc_status ? String(m.cc_status).toLowerCase() === "pass" : (ccCap > 0 ? cc <= ccCap : true);
              const nccPass = m?.ncc_status ? String(m.ncc_status).toLowerCase() === "pass" : (nccCap > 0 ? ncc <= nccCap : true);
              const pass = ccPass && nccPass;
              return [
                <span className="font-medium text-foreground">{m?.member ?? "—"}</span>,
                fmtMoney(cc),
                fmtMoney(ccCap),
                fmtMoney(ncc),
                fmtMoney(nccCap),
                <StatusBadge pass={pass} />,
              ];
            })}
          />
        )}
      </Card>

      {/* 3. Pension */}
      <Card title="Pension Drawdown Workings">
        {!pensionData || pensionData.length === 0 ? (
          <MutedCallout>No pension phase members identified.</MutedCallout>
        ) : (
          <DataTable
            headers={["Member", "Age", "Age Factor", "Opening Balance", "Minimum Required", "Actual Drawdown", "Status"]}
            rows={pensionData.map((p: any) => {
              const min = Number(p?.minimum_required ?? 0);
              const actual = Number(p?.actual_paid ?? 0);
              const explicitPass = p?.status ? String(p.status).toLowerCase() === "pass" : null;
              const computedPass = min > 0 ? actual >= min : true;
              const pass = explicitPass != null ? explicitPass : computedPass;
              const age = p?.dob_missing ? "—" : (p?.age_at_1_july ?? "—");
              const factor = p?.factor_pct;
              return [
                <span className="font-medium text-foreground">{p?.member ?? "—"}</span>,
                age,
                factor != null ? `${factor}%` : "—",
                fmtMoney(p?.opening_balance),
                fmtMoney(min),
                fmtMoney(actual),
                <StatusBadge pass={pass} />,
              ];
            })}
          />
        )}
      </Card>

      {/* 4. ATO Obligations */}
      <Card title="ATO Account Summary">
        {!atoSummary ? (
          <ReRunCallout />
        ) : (
          <div className="space-y-3">
            {atoTotalDebt > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-status-fail-border bg-status-fail-bg px-4 py-3 text-sm text-status-fail">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  ATO debt of <span className="font-semibold tabular-nums">{fmtMoney(atoTotalDebt)}</span> identified — contravention flagged.
                </span>
              </div>
            )}
            {atoAccounts.length === 0 ? (
              <MutedCallout>No ATO account details available.</MutedCallout>
            ) : (
              <DataTable
                headers={["Account Type", "Balance", "GIC", "Status"]}
                rows={atoAccounts.map((a: any) => {
                  const bal = Number(a?.balance ?? 0);
                  const inDebt = a?.is_debt != null ? !!a.is_debt : bal > 0;
                  const pass = a?.status ? String(a.status).toLowerCase() === "pass" : !inDebt;
                  return [
                    <span className="font-medium text-foreground">{titleCase(a?.type)}</span>,
                    fmtMoney(bal),
                    fmtMoney(a?.gic),
                    <StatusBadge pass={pass} passLabel="CLEAR" failLabel="DEBT" />,
                  ];
                })}
              />
            )}
          </div>
        )}
      </Card>

      {/* 5. In-House Assets */}
      <Card title="In-House Asset Test (SIS Act s.83)">
        {!ih ? (
          <ReRunCallout />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border border-border p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Related Party Asset Value</p>
                <p className="mt-1 text-xl font-semibold text-foreground tabular-nums">{fmtMoney(ihRelated)}</p>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Fund Assets</p>
                <p className="mt-1 text-xl font-semibold text-foreground tabular-nums">{fmtMoney(ihTotal)}</p>
              </div>
              <div className="rounded-md border border-border p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">In-House Asset %</p>
                <p className="mt-1 text-xl font-semibold text-foreground tabular-nums">
                  {ihPct == null ? "—" : `${ihPct.toFixed(2)}%`}
                </p>
              </div>
            </div>
            <div>
              <StatusBadge pass={ihPass} />
              {ihPass === false && (
                <span className="ml-2 text-xs text-muted-foreground">Exceeds 5% threshold under SIS s.83.</span>
              )}
              {ihPass === true && (
                <span className="ml-2 text-xs text-muted-foreground">Within 5% threshold.</span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 6. Evidence Register */}
      <Card title="Evidence Register">
        {classifications.length === 0 ? (
          <ReRunCallout />
        ) : (
          <DataTable
            headers={["Filename", "Document Type", "Confidence"]}
            rows={classifications.map((c: any) => [
              <span className="font-mono text-xs text-foreground/90 break-all">{c?.file_name ?? "—"}</span>,
              <span className="text-foreground/90">{titleCase(c?.category ?? c?.document_type)}</span>,
              <ConfidenceDot value={c?.confidence} />,
            ])}
          />
        )}
      </Card>

      {/* 7. System Workings */}
      <Card title="System Workings" muted collapsible defaultOpen={false}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-md border border-border p-3 bg-background">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Version</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{String(version)}</p>
            </div>
            <div className="rounded-md border border-border p-3 bg-background">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Completed</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{fmtDate(findingsCompletedAt)}</p>
            </div>
            <div className="rounded-md border border-border p-3 bg-background">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Documents Processed</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{String(documentCount ?? classifications.length ?? "—")}</p>
            </div>
            <div className="rounded-md border border-border p-3 bg-background">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Corrections Applied</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{corrections.length}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Corrections</p>
            {corrections.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No corrections applied during processing.</p>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90">
                {corrections.map((c, i) => (
                  <li key={i}>{humanizeCorrection(c)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
