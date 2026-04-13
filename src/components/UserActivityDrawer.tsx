import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, FileText, CreditCard, Clock } from "lucide-react";

interface ProfileRow {
  id: string;
  full_name: string | null;
  firm_name: string | null;
}

interface AuditRow {
  id: string;
  fund_name: string;
  financial_year: string | null;
  status: string | null;
  opinion: string | null;
  created_at: string | null;
  updated_at: string | null;
  payment_status: string | null;
}

interface Props {
  profile: ProfileRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserActivityDrawer({ profile, open, onOpenChange }: Props) {
  const [audits, setAudits] = useState<(AuditRow & { rfi_count: number })[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      // Fetch audits for this user
      const { data: auditData } = await supabase
        .from("audits")
        .select("id, fund_name, financial_year, status, opinion, created_at, updated_at, payment_status")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      const auditsRaw = (auditData ?? []) as AuditRow[];

      // Fetch RFI counts per audit
      const auditIds = auditsRaw.map((a) => a.id);
      let rfiCounts: Record<string, number> = {};
      if (auditIds.length > 0) {
        const { data: rfis } = await supabase
          .from("rfis")
          .select("id, audit_id")
          .in("audit_id", auditIds);
        if (!cancelled && rfis) {
          rfis.forEach((r) => {
            rfiCounts[r.audit_id] = (rfiCounts[r.audit_id] || 0) + 1;
          });
        }
      }

      // Fetch document count
      if (auditIds.length > 0) {
        const { count } = await supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .in("audit_id", auditIds);
        if (!cancelled) setTotalDocs(count ?? 0);
      } else {
        setTotalDocs(0);
      }

      if (!cancelled) {
        setAudits(auditsRaw.map((a) => ({ ...a, rfi_count: rfiCounts[a.id] || 0 })));
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, profile]);

  const creditsUsed = audits.filter((a) => a.payment_status === "paid").length;
  const lastActive = audits.length > 0
    ? audits.reduce((latest, a) => {
        const d = a.updated_at || a.created_at;
        return d && d > latest ? d : latest;
      }, "")
    : null;

  const statusVariant = (s: string | null): "default" | "secondary" | "destructive" | "outline" => {
    const lower = (s || "").toLowerCase();
    if (lower === "complete") return "default";
    if (lower === "in_progress" || lower === "processing") return "secondary";
    if (lower === "failed") return "destructive";
    return "outline";
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{profile?.full_name || "User"}</SheetTitle>
          {profile?.firm_name && (
            <p className="text-sm text-muted-foreground">{profile.firm_name}</p>
          )}
        </SheetHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <FileText className="h-3.5 w-3.5" />
                  Total Audits
                </div>
                <p className="text-2xl font-semibold text-foreground">{audits.length}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <FileText className="h-3.5 w-3.5" />
                  Documents
                </div>
                <p className="text-2xl font-semibold text-foreground">{totalDocs}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CreditCard className="h-3.5 w-3.5" />
                  Credits Used
                </div>
                <p className="text-2xl font-semibold text-foreground">{creditsUsed}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  Last Active
                </div>
                <p className="text-sm font-medium text-foreground mt-1">{lastActive ? formatDate(lastActive) : "Never"}</p>
              </div>
            </div>

            {/* Audit list */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Audits</h3>
              {audits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audits created yet.</p>
              ) : (
                <div className="space-y-2">
                  {audits.map((a) => (
                    <Link
                      key={a.id}
                      to={`/audits/${a.id}`}
                      className="block rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                      onClick={() => onOpenChange(false)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm truncate">{a.fund_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.financial_year || "—"} · {formatDate(a.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={statusVariant(a.status)} className="text-xs">
                            {a.status || "Pending"}
                          </Badge>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {a.opinion && <span>Opinion: {a.opinion}</span>}
                        <span>{a.rfi_count} RFIs</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
