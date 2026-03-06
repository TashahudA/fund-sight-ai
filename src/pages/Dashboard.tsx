import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloudUpload, TrendingUp, Clock, FileWarning, Timer, ArrowUpRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewAuditModal } from "@/components/NewAuditModal";
import { audits, type AuditStatus } from "@/lib/mockData";

const statusVariant = (s: AuditStatus) => {
  const map: Record<AuditStatus, "new" | "in-progress" | "pass" | "secondary" | "flag"> = {
    New: "new", "In Progress": "in-progress", Complete: "pass", "On Hold": "secondary", "RFI Sent": "flag",
  };
  return map[s];
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const recentAudits = audits.slice(0, 5);

  return (
    <div className="container max-w-6xl py-8 space-y-8 animate-fade-in">
      {/* Upload Hero */}
      <button
        onClick={() => setModalOpen(true)}
        className="group relative flex w-full items-center gap-5 rounded-xl border border-accent/20 bg-card p-7 text-left transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:-translate-y-1 card-shadow overflow-hidden"
      >
        {/* Subtle gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent/[0.03] via-transparent to-gold-warm/[0.03] pointer-events-none" />
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:bg-accent group-hover:text-accent-foreground group-hover:shadow-lg">
          <CloudUpload className="h-7 w-7" />
        </div>
        <div className="relative flex-1">
          <h2 className="font-serif-display text-xl font-semibold">Start a new SMSF audit</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Upload fund documents and let AI analyse compliance in minutes, not days.</p>
        </div>
        <Button variant="accent" size="lg" className="relative shrink-0 shadow-md" tabIndex={-1}>
          Run AI Audit
        </Button>
      </button>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {[
          { label: "Total Audits", value: "8", sub: "↑ 18% this month", subColor: "text-status-pass", icon: TrendingUp, iconColor: "text-accent" },
          { label: "In Progress", value: "2", sub: "4 awaiting review", icon: Clock, iconColor: "text-status-in-progress" },
          { label: "Open RFIs", value: "4", sub: "1 overdue", subColor: "text-status-flag", icon: FileWarning, iconColor: "text-status-fail", link: "/rfis" },
          { label: "Avg Turnaround", value: "4.1 hrs", sub: "60% faster", subColor: "text-status-pass", icon: Timer, iconColor: "text-accent" },
        ].map(stat => (
          <div
            key={stat.label}
            onClick={stat.link ? () => navigate(stat.link) : undefined}
            className={`group rounded-xl bg-card p-5 card-shadow transition-all duration-200 hover:-translate-y-1 ${stat.link ? "cursor-pointer" : ""}`}
            style={{ boxShadow: "var(--shadow-card)" }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-card)"; }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{stat.value}</p>
            <div className="mt-1.5 flex items-center gap-1">
              <span className={`text-xs font-medium ${stat.subColor || "text-muted-foreground"}`}>{stat.sub}</span>
              {stat.link && <ArrowUpRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Audits */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-display text-lg font-semibold">Recent Audits</h2>
          <button
            onClick={() => navigate("/audits")}
            className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="rounded-xl bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Fund</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">FY</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Opinion</th>
              </tr>
            </thead>
            <tbody>
              {recentAudits.map(audit => (
                <tr
                  key={audit.id}
                  onClick={() => navigate(`/audits/${audit.id}`)}
                  className="border-b last:border-0 cursor-pointer transition-all duration-150 hover:bg-accent/[0.03] group"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium group-hover:text-accent transition-colors">{audit.fundName}</div>
                    <div className="text-xs text-muted-foreground">{audit.firmName}</div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{audit.year}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={statusVariant(audit.status)}>{audit.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    {audit.opinion ? (
                      <Badge variant={audit.opinion === "Unqualified" ? "pass" : "flag"}>{audit.opinion}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NewAuditModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
