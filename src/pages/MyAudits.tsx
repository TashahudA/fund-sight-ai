import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus } from "lucide-react";
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
    <div className="container max-w-6xl py-8 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif-display text-2xl font-semibold">My Audits</h1>
        <Button variant="accent" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create new
        </Button>
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
      <div className="rounded-xl bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
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
