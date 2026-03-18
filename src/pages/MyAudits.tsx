import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Plus, Loader2, FileX, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

type SortColumn = "fund_name" | "financial_year" | "fund_type" | "status" | "created_at" | "opinion";
type SortDir = "asc" | "desc";

export default function MyAudits() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeCompleted, setIncludeCompleted] = useState(() => {
    try { return localStorage.getItem("myAudits_includeCompleted") === "true"; } catch { return false; }
  });
  const handleIncludeCompletedChange = (val: boolean) => {
    setIncludeCompleted(val);
    try { localStorage.setItem("myAudits_includeCompleted", String(val)); } catch {}
  };
  const [sortCol, setSortCol] = useState<SortColumn | null>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterYear, setFilterYear] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Open RFI counts per audit
  const [openRfiCounts, setOpenRfiCounts] = useState<Record<string, number>>({});

  const fetchAudits = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("audits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const auditList = data || [];
    setAudits(auditList);

    // Fetch open RFI counts
    if (auditList.length > 0) {
      const { data: openRfis } = await supabase
        .from("rfis")
        .select("audit_id")
        .eq("status", "open")
        .in("audit_id", auditList.map(a => a.id));
      const counts: Record<string, number> = {};
      (openRfis || []).forEach(r => {
        counts[r.audit_id] = (counts[r.audit_id] || 0) + 1;
      });
      setOpenRfiCounts(counts);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAudits();
  }, [user, location.key]);

  const getEffectiveStatus = (audit: Audit): string => {
    const openCount = openRfiCounts[audit.id] || 0;
    if ((audit.status || "").toLowerCase() === "complete" && openCount > 0) {
      return "In Progress";
    }
    return statusLabel(audit.status);
  };

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        // Third click: remove sort
        setSortCol(null);
      }
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortCol !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40" />;
    if (sortDir === "asc") return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filtered = (() => {
    let list = audits;

    // Filter out completed audits when toggle is OFF
    if (!includeCompleted) {
      list = list.filter(a => {
        const effective = getEffectiveStatus(a).toLowerCase();
        return effective !== "complete";
      });
    }

    // Search filter
    if (search) {
      list = list.filter(a => a.fund_name.toLowerCase().includes(search.toLowerCase()));
    }

    // Sorting
    if (sortCol) {
      list = [...list].sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";

        switch (sortCol) {
          case "fund_name":
            aVal = a.fund_name.toLowerCase();
            bVal = b.fund_name.toLowerCase();
            break;
          case "financial_year":
            aVal = a.financial_year || "";
            bVal = b.financial_year || "";
            break;
          case "fund_type":
            aVal = a.fund_type || "";
            bVal = b.fund_type || "";
            break;
          case "status":
            aVal = getEffectiveStatus(a).toLowerCase();
            bVal = getEffectiveStatus(b).toLowerCase();
            break;
          case "created_at":
            aVal = a.created_at || "";
            bVal = b.created_at || "";
            break;
          case "opinion":
            aVal = a.opinion || "";
            bVal = b.opinion || "";
            break;
        }

        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  })();

  const columns: { key: SortColumn; label: string }[] = [
    { key: "fund_name", label: "Fund" },
    { key: "financial_year", label: "Year" },
    { key: "fund_type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Date Created" },
    { key: "opinion", label: "Opinion" },
  ];

  return (
    <div className="container max-w-6xl py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Audits</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create new
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by fund name…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select><SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent><SelectItem value="2023">2023</SelectItem><SelectItem value="2024">2024</SelectItem><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
        </Select>
        <Select><SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in progress">In Progress</SelectItem><SelectItem value="complete">Complete</SelectItem><SelectItem value="on hold">On Hold</SelectItem></SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="completed" checked={includeCompleted} onCheckedChange={handleIncludeCompletedChange} />
          <Label htmlFor="completed" className="text-sm text-muted-foreground cursor-pointer">Include completed</Label>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileX className="h-12 w-12 text-border mb-4" />
          <h3 className="text-base font-semibold">No audits yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first SMSF audit to get started.</p>
          <Button size="sm" className="mt-4" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Create new
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      <SortIcon col={col.key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(audit => {
                const effectiveStatus = getEffectiveStatus(audit);
                const openCount = openRfiCounts[audit.id] || 0;
                return (
                  <tr
                    key={audit.id}
                    onClick={() => navigate(`/audits/${audit.id}`)}
                    className="border-b border-[hsl(var(--border-light))] last:border-0 cursor-pointer transition-colors duration-100 hover:bg-hover group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-sm">{audit.fund_name}</div>
                      {audit.fund_abn && <div className="text-xs text-muted-foreground">ABN: {audit.fund_abn}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{audit.financial_year || "—"}</td>
                    <td className="px-5 py-3.5 text-muted-foreground capitalize">{audit.fund_type || "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusVariant(effectiveStatus.toLowerCase())}>
                        {effectiveStatus}
                      </Badge>
                      {openCount > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-1.5">{openCount} open RFI{openCount !== 1 ? "s" : ""}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {audit.created_at ? new Date(audit.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {audit.opinion ? (
                        <span style={{ fontSize: "14px", color: "#111111", fontWeight: 400 }}>{audit.opinion}</span>
                      ) : (
                        <span style={{ fontSize: "14px", color: "#888888" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <NewAuditModal open={modalOpen} onOpenChange={(v) => { setModalOpen(v); if (!v) fetchAudits(); }} />
    </div>
  );
}
