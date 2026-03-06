import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloudUpload, Search, TrendingUp, Clock, FileWarning, Timer, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NewAuditModal } from "@/components/NewAuditModal";
import { audits, type AuditStatus } from "@/lib/mockData";

const statusVariant = (s: AuditStatus) => {
  const map: Record<AuditStatus, "new" | "in-progress" | "pass" | "secondary" | "flag"> = {
    New: "new", "In Progress": "in-progress", Complete: "pass", "On Hold": "secondary", "RFI Sent": "flag",
  };
  return map[s];
};

export default function MyAudits() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = audits.filter(a =>
    a.fundName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container max-w-6xl py-6 space-y-6 animate-fade-in">
      {/* Upload Hero */}
      <button
        onClick={() => setModalOpen(true)}
        className="group flex w-full items-center gap-5 rounded-xl border bg-card p-6 text-left transition-all duration-200 hover:border-accent hover:shadow-md hover:-translate-y-0.5"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
          <CloudUpload className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="font-serif-display text-lg font-semibold">Start a new SMSF audit</h2>
          <p className="text-sm text-muted-foreground">Upload fund documents and let AI analyse compliance in minutes, not days.</p>
        </div>
        <Button variant="accent" className="shrink-0" tabIndex={-1}>
          Run AI Audit
        </Button>
      </button>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Audits", value: "8", sub: "+12% this month", icon: TrendingUp, color: "text-accent" },
          { label: "In Progress", value: "2", sub: "1 awaiting review", icon: Clock, color: "text-status-in-progress" },
          { label: "Open RFIs", value: "4", sub: "1 overdue", icon: FileWarning, color: "text-status-fail", link: "/rfis" },
          { label: "Avg Turnaround", value: "4.1 hrs", sub: "vs 12 hrs manual", icon: Timer, color: "text-accent" },
        ].map(stat => (
          <div
            key={stat.label}
            onClick={stat.link ? () => navigate(stat.link) : undefined}
            className={`group rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-sm ${stat.link ? "cursor-pointer hover:border-accent" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{stat.sub}</span>
              {stat.link && <ArrowUpRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by fund name…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select><SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent><SelectItem value="2024-25">2024-25</SelectItem><SelectItem value="2023-24">2023-24</SelectItem></SelectContent>
        </Select>
        <Select><SelectTrigger className="w-[140px]"><SelectValue placeholder="Firm" /></SelectTrigger>
          <SelectContent><SelectItem value="bdo">BDO Australia</SelectItem><SelectItem value="pkf">PKF Melbourne</SelectItem><SelectItem value="hlb">HLB Mann Judd</SelectItem></SelectContent>
        </Select>
        <Select><SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="in-progress">In Progress</SelectItem><SelectItem value="complete">Complete</SelectItem><SelectItem value="on-hold">On Hold</SelectItem><SelectItem value="rfi-sent">RFI Sent</SelectItem></SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="completed" defaultChecked />
          <Label htmlFor="completed" className="text-sm text-muted-foreground cursor-pointer">Include completed</Label>
        </div>
      </div>

      {/* Audits Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Fund</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Year</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date Created</th>
              <th className="px-5 py-3 text-left font-medium text-muted-foreground">Opinion</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(audit => (
              <tr
                key={audit.id}
                onClick={() => navigate(`/audit/${audit.id}`)}
                className="border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/30"
              >
                <td className="px-5 py-3.5">
                  <div className="font-medium">{audit.fundName}</div>
                  <div className="text-xs text-muted-foreground">{audit.firmName}</div>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{audit.year}</td>
                <td className="px-5 py-3.5">
                  <Badge variant={statusVariant(audit.status)}>{audit.status}</Badge>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{audit.dateCreated}</td>
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

      <NewAuditModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
