import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloudUpload, TrendingUp, Clock, FileWarning, Timer, ArrowRight } from "lucide-react";
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
          { label: "TOTAL AUDITS", value: "8", sub: "↑ 18% this month", subColor: "text-status-pass", icon: TrendingUp },
          { label: "IN PROGRESS", value: "2", sub: "4 awaiting review", icon: Clock },
          { label: "OPEN RFIS", value: "4", sub: "1 overdue", subColor: "text-status-flag", icon: FileWarning, link: "/rfis" },
          { label: "AVG TURNAROUND", value: "4.1 hrs", sub: "60% faster", subColor: "text-status-pass", icon: Timer },
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
            <div className="mt-1.5 flex items-center gap-1">
              <span className={`text-xs font-medium ${stat.subColor || "text-muted-foreground"}`}>{stat.sub}</span>
            </div>
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
              {recentAudits.map(audit => (
                <tr
                  key={audit.id}
                  onClick={() => navigate(`/audits/${audit.id}`)}
                  className="border-b border-[hsl(var(--border-light))] last:border-0 cursor-pointer transition-colors duration-100 hover:bg-hover group"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-sm group-hover:text-foreground transition-colors">{audit.fundName}</div>
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
