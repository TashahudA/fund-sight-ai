import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CloudUpload, TrendingUp, Clock, FileWarning, Timer, ArrowRight, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewAuditModal } from "@/components/NewAuditModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Audit = Tables<"audits">;

const statusVariant = (s: string | null) => {
  const map: Record<string, "new" | "in-progress" | "pass" | "secondary" | "flag"> = {
    pending: "new", "in progress": "in-progress", complete: "pass", "on hold": "secondary", "rfi sent": "flag",
  };
  return map[(s || "").toLowerCase()] || "secondary";
};

const statusLabel = (s: string | null) => {
  if (!s) return "Pending";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

interface DashboardStats {
  totalAudits: number;
  inProgress: number;
  awaitingReview: number;
  openRfis: number;
  overdueRfis: number;
  avgTurnaround: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalAudits: 0, inProgress: 0, awaitingReview: 0,
    openRfis: 0, overdueRfis: 0, avgTurnaround: "—",
  });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Fetch all audits and recent 5 in parallel
      const [allAuditsRes, recentRes, rfisRes] = await Promise.all([
        supabase.from("audits").select("*").eq("user_id", user.id),
        supabase.from("audits").select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(5),
        supabase.from("rfis").select("id, status, created_at, audit_id, audits!inner(user_id)")
          .eq("audits.user_id", user.id),
      ]);

      const allAudits = allAuditsRes.data || [];
      setAudits(recentRes.data || []);

      // Debug: log actual statuses
      console.log("[Dashboard] Audit statuses:", allAudits.map(a => ({ id: a.id, status: a.status })));

      const totalAudits = allAudits.length;
      // IN PROGRESS: count all audits where status is not "complete" (case-insensitive)
      const inProgress = allAudits.filter(a => (a.status || "").toLowerCase() !== "complete").length;

      // Awaiting review: not complete, has ai_findings, and still has open RFIs
      const allRfis = rfisRes.data || [];
      const openRfis = allRfis.filter(r => (r.status || "").toLowerCase() === "open");
      const auditIdsWithOpenRfis = new Set(openRfis.map(r => r.audit_id));
      const awaitingReview = allAudits.filter(a => {
        return (a.status || "").toLowerCase() !== "complete" && a.ai_findings && auditIdsWithOpenRfis.has(a.id);
      }).length;

      // Overdue RFIs (open > 7 days)
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const overdueRfis = openRfis.filter(r => r.created_at && now - new Date(r.created_at).getTime() > sevenDays).length;

      // AVG TURNAROUND: updated_at minus created_at for audits with ai_findings
      const auditsWithFindings = allAudits.filter(a => a.ai_findings && a.updated_at && a.created_at);
      let avgTurnaround = "—";
      if (auditsWithFindings.length > 0) {
        const totalMs = auditsWithFindings.reduce((sum, a) => {
          const createdTime = new Date(a.created_at!).getTime();
          const updatedTime = new Date(a.updated_at!).getTime();
          return sum + Math.max(updatedTime - createdTime, 0);
        }, 0);
        const avgMs = totalMs / auditsWithFindings.length;
        const avgMins = avgMs / 60000;
        console.log("[Dashboard] Avg turnaround ms:", avgMs, "mins:", avgMins, "audits counted:", auditsWithFindings.length);
        if (avgMins < 1) {
          avgTurnaround = "< 1 min";
        } else if (avgMins < 60) {
          avgTurnaround = `${Math.round(avgMins)} mins`;
        } else {
          avgTurnaround = `${(avgMins / 60).toFixed(1)} hrs`;
        }
      }

      setStats({ totalAudits, inProgress, awaitingReview, openRfis: openRfis.length, overdueRfis, avgTurnaround });
      setLoading(false);
    };
    fetchData();
  }, [user, location.key]);

  return (
    <div className="container max-w-6xl py-8 space-y-8 animate-fade-in">
      {/* Upload Hero */}
      <button
        onClick={() => setModalOpen(true)}
        className="group relative flex w-full items-center gap-5 rounded-lg border border-border bg-background p-6 text-left transition-colors duration-100 hover:bg-hover"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors duration-100 group-hover:bg-foreground group-hover:text-background group-hover:border-foreground">
          <CloudUpload className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold">Start a new SMSF audit</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Upload fund documents and let AI analyse compliance in minutes, not days.</p>
        </div>
        <Button size="default" tabIndex={-1}>
          Run AI Audit
        </Button>
      </button>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "TOTAL AUDITS", value: String(stats.totalAudits), icon: TrendingUp },
          { label: "IN PROGRESS", value: String(stats.inProgress), sub: stats.awaitingReview > 0 ? `${stats.awaitingReview} awaiting review` : undefined, icon: Clock },
          { label: "OPEN RFIS", value: String(stats.openRfis), sub: stats.overdueRfis > 0 ? `${stats.overdueRfis} overdue` : undefined, subColor: stats.overdueRfis > 0 ? "text-amber-500" : undefined, icon: FileWarning, link: "/rfis" },
          { label: "AVG TURNAROUND", value: stats.avgTurnaround, icon: Timer },
        ].map(stat => (
          <div
            key={stat.label}
            onClick={stat.link ? () => navigate(stat.link) : undefined}
            className={`rounded-lg border border-border bg-background p-5 transition-colors duration-100 hover:bg-hover ${stat.link ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{stat.value}</p>
            {stat.sub && (
              <div className="mt-1.5 flex items-center gap-1">
                <span className={`text-xs font-medium ${stat.subColor || "text-muted-foreground"}`}>{stat.sub}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent Audits */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Audits</h2>
          <button
            onClick={() => navigate("/audits")}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-100"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {!loading && audits.length === 0 ? (
          <div className="rounded-lg border border-border bg-background p-8 text-center">
            <FileX className="h-10 w-10 text-border mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No audits yet —{" "}
              <button onClick={() => setModalOpen(true)} className="text-foreground font-medium underline underline-offset-2 hover:no-underline">
                start your first AI audit
              </button>
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Fund</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">FY</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Opinion</th>
                </tr>
              </thead>
              <tbody>
                {audits.map(audit => (
                  <tr
                    key={audit.id}
                    onClick={() => navigate(`/audits/${audit.id}`)}
                    className="border-b border-[hsl(var(--border-light))] last:border-0 cursor-pointer transition-colors duration-100 hover:bg-hover group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-sm group-hover:text-foreground transition-colors">{audit.fund_name}</div>
                      {audit.fund_abn && <div className="text-xs text-muted-foreground">ABN: {audit.fund_abn}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{audit.financial_year || "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant(audit.status)}>{statusLabel(audit.status)}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {audit.opinion ? (
                        <span style={{ fontSize: "14px", color: "#111111", fontWeight: 400 }}>{audit.opinion}</span>
                      ) : (
                        <span style={{ fontSize: "14px", color: "#888888" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewAuditModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
