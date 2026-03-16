import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CloudUpload, Zap, Loader2, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NewAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NewAuditModal({ open, onOpenChange }: NewAuditModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fundName, setFundName] = useState("");
  const [abn, setAbn] = useState("");
  const [financialYear, setFinancialYear] = useState("");
  const [fundType, setFundType] = useState("");
  const [firm, setFirm] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFundName("");
    setAbn("");
    setFinancialYear("");
    setFundType("");
    setFirm("");
    setFiles([]);
    setError(null);
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleSubmit = async () => {
    if (!user) { setError("You must be logged in to create an audit."); return; }
    if (!fundName.trim()) { setError("Fund name is required."); return; }

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

    if (insertError) { setLoading(false); setError(insertError.message); return; }

    const auditId = data.id;

    if (files.length > 0) {
      setUploadingFiles(true);
      try {
        for (const file of files) {
          const filePath = `${auditId}/${file.name}`;
          const { error: storageError } = await supabase.storage
            .from("audit-documents")
            .upload(filePath, file, { upsert: true });
          if (storageError) throw storageError;

          const { data: urlData } = supabase.storage
            .from("audit-documents")
            .getPublicUrl(filePath);

          const { error: dbError } = await supabase.from("documents").insert({
            audit_id: auditId,
            file_name: file.name,
            file_type: file.type || file.name.split(".").pop() || "unknown",
            file_url: urlData.publicUrl,
          });
          if (dbError) throw dbError;
        }
      } catch (err: any) {
        setLoading(false);
        setUploadingFiles(false);
        setError(`File upload failed: ${err.message}`);
        return;
      }
      setUploadingFiles(false);
    }

    setLoading(false);
    resetForm();
    onOpenChange(false);
    navigate(`/audits/${auditId}`);
  };

  const buttonText = uploadingFiles
    ? "Uploading Files…"
    : loading
      ? "Creating…"
      : "Run AI Audit — $20";

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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="firm">Accountant / Firm (optional)</Label>
            <Input id="firm" placeholder="e.g. BDO Australia" value={firm} onChange={(e) => setFirm(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Upload Fund Pack</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.csv,.jpg,.jpeg,.png,.docx"
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ""; } }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer ${
                dragOver ? "border-accent bg-accent/10" : "border-input hover:border-accent hover:bg-accent/[0.03]"
              }`}
            >
              <CloudUpload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground">PDF, XLSX, CSV, JPG, PNG, DOCX accepted</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto">
                {files.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-muted-foreground text-xs shrink-0">{formatFileSize(file.size)}</span>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-muted-foreground hover:text-destructive ml-2 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button variant="accent" className="gap-2 shadow-md" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}