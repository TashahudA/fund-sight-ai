import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CloudUpload, Plus, Loader2, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sanitizeFileName } from "@/lib/sanitizeFileName";

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
          const safeName = sanitizeFileName(file.name);
          const filePath = `${auditId}/${safeName}`;
          const { error: storageError } = await supabase.storage
            .from("audit-documents")
            .upload(filePath, file, { upsert: true });
          if (storageError) throw storageError;

          const { data: urlData } = supabase.storage
            .from("audit-documents")
            .getPublicUrl(filePath);

          const { error: dbError } = await supabase.from("documents").insert({
            audit_id: auditId,
            file_name: safeName,
            file_type: file.type || file.name.split(".").pop() || "unknown",
            file_url: urlData.publicUrl,
            file_size: file.size,
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
      <DialogContent className="w-[600px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-x-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Start New SMSF Audit</DialogTitle>
          <DialogDescription>Enter fund details to begin AI-powered compliance analysis.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 overflow-y-auto overflow-x-hidden flex-1 min-h-0">
          {error && (
            <div className="rounded-md border border-status-fail-border bg-status-fail-bg px-4 py-3 text-sm text-status-fail">
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
              className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center transition-colors duration-100 cursor-pointer ${
                files.length > 0 ? "p-3" : "p-6"
              } ${
                dragOver ? "border-foreground bg-active" : "border-border bg-hover hover:border-foreground"
              }`}
            >
              <CloudUpload className={`${files.length > 0 ? "h-5 w-5" : "h-8 w-8"} text-muted-foreground shrink-0`} />
              <div>
                <p className="text-sm font-medium">{files.length > 0 ? "Add more files" : "Drop files here or click to browse"}</p>
                {files.length === 0 && <p className="text-xs text-muted-foreground">PDF, XLSX, CSV, JPG, PNG, DOCX accepted</p>}
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-0 mt-1.5">
                {files.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="flex items-center justify-between py-1.5 px-1 text-sm border-b border-border last:border-b-0 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate text-[13px] max-w-[360px]">{file.name}</span>
                      <span className="text-muted-foreground text-xs shrink-0">{formatFileSize(file.size)}</span>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-muted-foreground hover:text-status-fail ml-2 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button className="gap-2" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
