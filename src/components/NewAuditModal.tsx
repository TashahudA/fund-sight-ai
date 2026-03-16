import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CloudUpload, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NewAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAuditModal({ open, onOpenChange }: NewAuditModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fundName, setFundName] = useState("");
  const [abn, setAbn] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [fundType, setFundType] = useState("");
  const [firm, setFirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFundName("");
    setAbn("");
    setFinancialYear("");
    setFundType("");
    setFirm("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!user) {
      setError("You must be logged in to create an audit.");
      return;
    }
    if (!fundName.trim()) {
      setError("Fund name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("audits")
      .insert({
        fund_name: fundName.trim(),
        fund_abn: abn.trim() || null,
        financial_year: financialYear || null,
        fund_type: fundType || null,
        user_id: user.id,
        status: "pending",
      })
      .select("id")
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    resetForm();
    onOpenChange(false);
    navigate(`/audits/${data.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) resetForm(); } }}>
      <DialogContent className="sm:max-w-lg backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="font-serif-display text-xl">Start New SMSF Audit</DialogTitle>
          <DialogDescription>Enter fund details to begin AI-powered compliance analysis.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fundName">Fund Name *</Label>
              <Input id="fundName" placeholder="e.g. Smith Family Super Fund" value={fundName} onChange={(e) => setFundName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="abn">ABN</Label>
              <Input id="abn" placeholder="XX XXX XXX XXX" value={abn} onChange={(e) => setAbn(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Financial Year</Label>
              <Select value={financialYear} onValueChange={setFinancialYear}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["2023", "2024", "2025", "2026"].map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fund Type</Label>
              <Select value={fundType} onValueChange={setFundType}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="accumulation">Accumulation</SelectItem>
                  <SelectItem value="pension">Pension</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firm">Accountant / Firm (optional)</Label>
            <Input id="firm" placeholder="e.g. BDO Australia" value={firm} onChange={(e) => setFirm(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Upload Fund Pack</Label>
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input p-8 text-center transition-all duration-200 hover:border-accent hover:bg-accent/[0.03] cursor-pointer">
              <CloudUpload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground">PDF, XLSX, CSV, JPG, PNG accepted</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button variant="accent" className="gap-2 shadow-md" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {loading ? "Creating…" : "Run AI Audit — $20"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
