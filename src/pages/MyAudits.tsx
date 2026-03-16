import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Loader2, FileX } from "lucide-react";
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

export default function MyAudits() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudits = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("audits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAudits(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAudits();
  }, [user]);

  const filtered = audits.filter(a =>
    a.fund_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container max-w-6xl py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-serif-display text-2xl font-semibold">My Audits</h1>
        <Button variant="accent" size="sm" onClick={() => setModalOpen(true)}>
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
          <Switch id="completed" defaultChecked />
          <Label htmlFor="completed" className="text-sm text-muted-foreground cursor-pointer">Include completed</Label>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileX className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-serif-display text-lg font-semibold">No audits yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first SMSF audit to get started.</p>
          <Button variant="accent" size="sm" className="mt-4" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Create new
          </Button>
        </div>
      ) : (
        <div className="rounded-xl bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Fund</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Year</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Type</th>
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
                    <div className="font-medium group-hover:text-accent transition-colors">{audit.fund_name}</div>
                    {audit.fund_abn && <div className="text-xs text-muted-foreground">ABN: {audit.fund_abn}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{audit.financial_year || "—"}</td>
                  <td className="px-5 py-3.5 text-muted-foreground capitalize">{audit.fund_type || "—"}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={statusVariant(audit.status)}>{statusLabel(audit.status)}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {audit.created_at ? new Date(audit.created_at).toLocaleDateString() : "—"}
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
      )}

      <NewAuditModal open={modalOpen} onOpenChange={(v) => { setModalOpen(v); if (!v) fetchAudits(); }} />
    </div>
  );
}
