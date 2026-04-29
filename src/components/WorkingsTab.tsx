import { useMemo } from "react";
import { ChevronDown, FileText, Calculator, Database, Settings2, AlertCircle, ScrollText } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface WorkingsTabProps {
  aiFindings: any;
  documentCount?: number;
  findingsCompletedAt?: string | null;
  onRunAudit?: () => void;
}

const normalizeStatus = (s?: string) => {
  const lower = (s || "").toLowerCase();
  if (lower === "pass") return "pass";
  if (lower === "pass_with_review") return "pass_with_review";
  if (lower === "fail" || lower === "refer_to_auditor") return "fail";
  return "needs_info";
};

const leftBorderForStatus = (s?: string) => {
  const n = normalizeStatus(s);
  if (n === "pass") return "border-l-status-pass";
  if (n === "pass_with_review") return "border-l-status-flag";
  if (n === "fail") return "border-l-status-fail";
  return "border-l-status-new";
};

const fmtMoney = (v: any) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString()}`;
};

const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
};

const confidenceBadge = (c?: string) => {
  const lower = (c || "").toLowerCase();
  let variant: "pass" | "flag" | "fail" | "secondary" = "secondary";
  let label = lower || "—";
  if (lower === "high") variant = "pass";
  else if (lower === "medium") variant = "flag";
  else if (lower === "low") variant = "fail";
  else if (lower === "conflict") {
    variant = "flag";
    label = "uncertain";
  }
  return (
    <Badge variant={variant} className="text-[10px] px-1.5 py-0 capitalize">
      {label}
    </Badge>
  );
};

function Section({
  icon,
  title,
  count,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number | string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-lg border border-border bg-background">
      <CollapsibleTrigger className="group flex w-full items-center justify-between p-4 text-left">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {count !== undefined && count !== null && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border p-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StatBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function FieldList({ label, items }: { label: string; items?: string[] | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      {items && items.length > 0 ? (
        <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground/90">
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground italic">None documented</p>
      )}
    </div>
  );
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
            Run the audit to generate materiality calculations, the audit program, and the evidence register.
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
  const materiality = det?.materiality ?? null;
  const findings: any[] = Array.isArray(data?.compliance_findings) ? data.compliance_findings : [];
  const classifications: any[] = Array.isArray(ing?.classifications) ? ing.classifications : [];
  const corrections: any[] = Array.isArray(data?._corrections) ? data._corrections : [];
  const version = data?._version ?? "—";
  const detContext = det?.context ?? det?.analysis_context ?? det;
  const balanceSheetRaw: string = (data?._balance_sheet_raw ?? "").toString();

  return (
    <div className="space-y-3">
      {/* 1. Materiality */}
      <Section icon={<Calculator className="h-4 w-4" />} title="Materiality" defaultOpen>
        {materiality ? (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox label="Overall" value={fmtMoney(materiality?.overall)} hint="2% of benchmark" />
            <StatBox label="Performance" value={fmtMoney(materiality?.performance)} hint="75% of overall" />
            <StatBox label="Trivial threshold" value={fmtMoney(materiality?.trivial)} hint="5% of overall" />
            <StatBox
              label="Benchmark"
              value={fmtMoney(materiality?.benchmark_value ?? materiality?.total_assets)}
              hint={materiality?.benchmark ?? "Total assets"}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Materiality calculated at 2% of total assets as a planning guide per ASA 320. Auditors should apply professional judgement to determine appropriate materiality for each engagement.
          </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">Materiality not calculated for this audit.</p>
        )}
      </Section>

      {/* 2. Balance Sheet Extraction */}
      <Section icon={<ScrollText className="h-4 w-4" />} title="Balance Sheet Extraction" defaultOpen>
        {!balanceSheetRaw ? (
          <p className="text-sm text-muted-foreground">
            Re-run the audit to generate balance sheet extraction data.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-2">
              Raw extraction from financial statements as read by the AI. Use this to verify figures match source documents.
            </p>
            <pre className="text-xs font-mono bg-muted rounded-md p-4 overflow-auto max-h-[500px] whitespace-pre-wrap text-foreground leading-relaxed">
{balanceSheetRaw}
            </pre>
          </>
        )}
      </Section>

      {/* 3. Audit Program */}
      <Section
        icon={<FileText className="h-4 w-4" />}
        title="Audit Program"
        count={findings.length || undefined}
        defaultOpen={false}
      >
        {findings.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No compliance findings recorded.</p>
        ) : (
          <div className="space-y-2">
            {findings.map((f, i) => (
              <Collapsible key={i} className={`rounded-md border border-border border-l-[3px] ${leftBorderForStatus(f?.status)} bg-background`}>
                <CollapsibleTrigger className="group flex w-full items-center justify-between p-3 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{f?.area ?? "Untitled area"}</span>
                    {f?.part && <span className="text-[10px] uppercase text-muted-foreground">Part {f.part}</span>}
                    {f?.reference && <span className="text-[11px] text-muted-foreground truncate">· {f.reference}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {f?.confidence && confidenceBadge(f.confidence)}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border p-3 space-y-3">
                    <FieldList label="Assertions tested" items={f?.assertions} />
                    <FieldList label="Procedures performed" items={f?.procedures} />
                    <FieldList label="Evidence obtained" items={f?.evidence} />
                    <FieldList label="Exceptions noted" items={f?.exceptions} />
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conclusion</p>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {f?.detail ?? f?.conclusion ?? <span className="text-muted-foreground italic">No conclusion documented</span>}
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </Section>

      {/* 3. Evidence Register */}
      <Section
        icon={<Database className="h-4 w-4" />}
        title="Evidence Register"
        count={classifications.length || undefined}
        defaultOpen
      >
        {classifications.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No document classifications recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left p-2 font-medium">Filename</th>
                  <th className="text-left p-2 font-medium">Document type</th>
                  <th className="text-left p-2 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {classifications.map((c, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2 font-mono text-xs text-foreground/90 break-all">{c?.file_name ?? "—"}</td>
                    <td className="p-2 text-foreground/90">{c?.category ?? c?.document_type ?? "—"}</td>
                    <td className="p-2">{confidenceBadge(c?.confidence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* 4. System Workings */}
      <Section icon={<Settings2 className="h-4 w-4" />} title="System Workings" defaultOpen>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatBox label="Version" value={String(version)} />
          <StatBox label="Completed" value={fmtDate(findingsCompletedAt)} />
          <StatBox label="Documents" value={String(documentCount ?? classifications.length ?? "—")} />
          <StatBox label="Corrections" value={String(corrections.length)} />
        </div>

        {corrections.length > 0 && (
          <div className="space-y-1 mb-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">System corrections applied</p>
            <ul className="list-disc pl-5 space-y-0.5 text-sm text-foreground/90">
              {corrections.map((c, i) => (
                <li key={i}>{typeof c === "string" ? c : (c?.message ?? JSON.stringify(c))}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Deterministic analysis context</p>
          <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-[11px] font-mono text-foreground/80 whitespace-pre-wrap break-all">
{detContext ? JSON.stringify(detContext, null, 2) : "No deterministic context available."}
          </pre>
        </div>
      </Section>
    </div>
  );
}
