import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, Paperclip, Send, CheckCircle2, Loader2, MessageSquare, FileText, Bot } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName } from "@/lib/sanitizeFileName";
import { sendRfiMessage, reviewRfiDocument, resolveRfi } from "@/lib/auditApi";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type RFI = Tables<"rfis">;
type RFIMessage = Tables<"rfi_messages">;

type TabFilter = "open" | "resolved" | "all";

const CATEGORIES = ["Contributions", "Pension", "Investments", "Trust Deed", "Members", "Expenses", "Other"];
const PRIORITIES = ["Low", "Medium", "High"];

const statusBadgeVariant = (s: string | null) => {
  if (s === "open") return "new" as const;
  if (s === "resolved") return "pass" as const;
  return "secondary" as const;
};

const priorityVariant = (p: string | null) => {
  if (p?.toLowerCase() === "high") return "high" as const;
  if (p?.toLowerCase() === "medium") return "medium" as const;
  return "low" as const;
};

interface RFITabProps {
  auditId: string;
  className?: string;
  onCountChange?: () => void;
  onAutoComplete?: () => void;
}

export function RFITab({ auditId, className, onCountChange, onAutoComplete }: RFITabProps) {
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email || "You";
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RFIMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [attachUploading, setAttachUploading] = useState(false);
  const [aiReviewing, setAiReviewing] = useState(false);
  const [resolutionSuggested, setResolutionSuggested] = useState<string | null>(null);
  const [confirmingResolution, setConfirmingResolution] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);

  // New RFI form
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: "", category: "", priority: "Medium", description: "" });

  const fetchRfis = async () => {
    const { data, error } = await supabase
      .from("rfis")
      .select("*")
      .eq("audit_id", auditId)
      .order("created_at", { ascending: false });
    if (!error && data) setRfis(data);
    setLoading(false);
    onCountChange?.();
  };

  // checkAutoComplete removed — audit status is DB-driven only

  useEffect(() => { fetchRfis(); }, [auditId]);

  const fetchMessages = async (rfiId: string) => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from("rfi_messages")
      .select("*")
      .eq("rfi_id", rfiId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
    setLoadingMessages(false);
  };

  useEffect(() => {
    if (selectedId) fetchMessages(selectedId);
    else setMessages([]);
  }, [selectedId]);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedId) return;
    const messageText = replyText.trim();
    setSending(true);
    const { error } = await supabase.from("rfi_messages").insert({
      rfi_id: selectedId,
      message: messageText,
      sender: "auditor",
    });
    if (error) {
      toast({ title: "Error sending message", description: error.message, variant: "destructive" });
      setSending(false);
      return;
    }
    setReplyText("");
    await fetchMessages(selectedId);
    setSending(false);

    // Trigger AI response
    setAiReviewing(true);
    try {
      await sendRfiMessage(auditId, selectedId, messageText);
      await Promise.all([fetchMessages(selectedId), fetchRfis()]);
      await checkAutoComplete();
    } catch (err: any) {
      console.error("AI chat error:", err);
      toast({ title: "AI response failed", description: err.message, variant: "destructive" });
    } finally {
      setAiReviewing(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedId) return;
    setResolving(true);
    const { error } = await supabase
      .from("rfis")
      .update({ status: "resolved" })
      .eq("id", selectedId);
    if (error) {
      toast({ title: "Error resolving RFI", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "RFI resolved" });
      await fetchRfis();
      await checkAutoComplete();
    }
    setResolving(false);
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length || !selectedId) return;
    setAttachUploading(true);
    try {
      const fileNames: string[] = [];
      for (const file of Array.from(selectedFiles)) {
        const safeName = sanitizeFileName(file.name);
        const filePath = `${auditId}/rfi-responses/${safeName}`;
        const { error: storageError } = await supabase.storage
          .from("audit-documents")
          .upload(filePath, file, { upsert: true });
        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from("documents").insert({
          audit_id: auditId,
          file_name: safeName,
          file_type: file.type || file.name.split(".").pop() || "unknown",
          file_url: filePath,
          file_size: file.size,
        });
        if (dbError) throw dbError;
        fileNames.push(file.name);
      }

      // Post attachment message
      const safeNames = fileNames.map(f => sanitizeFileName(f));
      await supabase.from("rfi_messages").insert({
        rfi_id: selectedId,
        message: `📎 Document uploaded: ${fileNames.join(", ")} — AI is reviewing...`,
        sender: "auditor",
      });

      toast({ title: "Files attached", description: `${fileNames.length} file(s)` });
      await fetchMessages(selectedId);

      // Trigger AI review
      setAiReviewing(true);
      try {
        await reviewRfiDocument(auditId, selectedId, safeNames.join(", "));
        await Promise.all([fetchMessages(selectedId), fetchRfis()]);
        await checkAutoComplete();
      } catch (err: any) {
        console.error("AI review error:", err);
        toast({ title: "AI review failed", description: err.message, variant: "destructive" });
      } finally {
        setAiReviewing(false);
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setAttachUploading(false);
      if (attachInputRef.current) attachInputRef.current.value = "";
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("rfis").insert({
      audit_id: auditId,
      title: formData.title.trim(),
      category: formData.category || null,
      priority: formData.priority.toLowerCase(),
      description: formData.description.trim() || null,
      status: "open",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "RFI created" });
      setShowForm(false);
      setFormData({ title: "", category: "", priority: "Medium", description: "" });
      fetchRfis();
    }
  };

  const counts = {
    open: rfis.filter(r => r.status === "open").length,
    resolved: rfis.filter(r => r.status === "resolved").length,
    all: rfis.length,
  };

  const filtered = (() => {
    let list = rfis;
    if (tab !== "all") list = list.filter(r => r.status === tab);
    if (search) list = list.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));
    return list;
  })();

  const selected = rfis.find(r => r.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rfis.length === 0 && !showForm) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <MessageSquare className="h-10 w-10 text-border mb-3" />
        <p className="text-sm text-muted-foreground mb-4">No RFIs raised yet.</p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Raise RFI
        </Button>
        <NewRFIDialog open={showForm} onClose={() => setShowForm(false)} formData={formData} setFormData={setFormData} onSubmit={handleCreate} submitting={submitting} />
      </div>
    );
  }

  return (
    <>
      <div className={`flex rounded-lg border border-border bg-background overflow-hidden ${className || ""}`}>
        {/* Left Panel */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border lg:w-[380px]">
          <div className="p-3 border-b border-border flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search RFIs…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" className="shrink-0" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Raise RFI
            </Button>
          </div>

          <div className="flex border-b border-border">
            {(["open", "resolved", "all"] as TabFilter[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors duration-100 border-b-2 capitalize ${
                  tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t} <span className="text-muted-foreground">({counts[t]})</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map(rfi => (
              <button
                key={rfi.id}
                onClick={() => setSelectedId(rfi.id)}
                className={`w-full text-left px-4 py-4 border-b border-[hsl(var(--border-light))] transition-colors duration-100 ${
                  selectedId === rfi.id
                    ? "bg-active border-l-2 border-l-foreground"
                    : "hover:bg-hover border-l-2 border-l-transparent"
                }`}
              >
                <div className="text-sm font-medium leading-snug line-clamp-1">{rfi.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{rfi.category || "Uncategorized"}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={priorityVariant(rfi.priority)} className="text-[10px] px-1.5 py-0 capitalize">{rfi.priority || "medium"}</Badge>
                  <Badge variant={statusBadgeVariant(rfi.status)} className="text-[10px] px-1.5 py-0 capitalize">{rfi.status || "open"}</Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {rfi.created_at ? new Date(rfi.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No RFIs match your filter.</div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-1 flex-col">
          {selected ? (
            <>
              <div className="border-b border-border p-5">
                <h2 className="text-base font-semibold">{selected.title}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                  <Badge variant={priorityVariant(selected.priority)} className="capitalize">{selected.priority || "medium"}</Badge>
                  <Badge variant="secondary" className="capitalize">{selected.category || "Uncategorized"}</Badge>
                  <Badge variant={statusBadgeVariant(selected.status)} className="capitalize">{selected.status || "open"}</Badge>
                  <span className="text-xs">Raised: {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : "N/A"}</span>
                </div>
                {selected.description && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{selected.description}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
                ) : (
                  messages.map(msg => {
                    const isAI = msg.sender === "claude" || msg.sender === "ai";
                    const isAuditor = msg.sender === "auditor";
                    const isRight = isAuditor;

                    const bgColor = isAI
                      ? "#f0f4ff"
                      : isAuditor
                        ? "#f4f4f4"
                        : "#f0fdf4";

                    const senderLabel = isAI
                      ? "Auditron"
                      : isAuditor
                        ? displayName
                        : msg.sender;

                    return (
                      <div key={msg.id} className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[75%] rounded-lg" style={{ padding: "12px 16px", backgroundColor: bgColor }}>
                          {isAI && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Bot className="h-3.5 w-3.5 text-status-new" />
                              <Badge variant="new" className="text-[10px] px-1.5 py-0">AI</Badge>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed" style={{ fontSize: "14px" }}>{msg.message}</p>
                          <div className="flex items-center gap-2 mt-2 text-muted-foreground" style={{ fontSize: "12px" }}>
                            <span className="font-medium">{senderLabel}</span>
                            <span>{msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {aiReviewing && (
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-lg px-4 py-3 bg-status-new-bg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-status-new" />
                        <span className="text-sm text-muted-foreground">Auditron is reviewing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border p-4 flex items-center gap-3" style={{ padding: "16px" }}>
                <input
                  ref={attachInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachFile}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 shrink-0"
                  onClick={() => attachInputRef.current?.click()}
                  disabled={attachUploading || aiReviewing}
                >
                  {attachUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  placeholder="Type your reply…"
                  className="flex-1 h-[44px]"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                />
                <Button className="h-10" onClick={handleSendMessage} disabled={sending || !replyText.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Send
                </Button>
                {selected.status !== "resolved" && (
                  <Button variant="outline" className="h-10" onClick={handleResolve} disabled={resolving}>
                    {resolving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                    Resolve
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select an RFI to view details
            </div>
          )}
        </div>
      </div>

      <NewRFIDialog open={showForm} onClose={() => setShowForm(false)} formData={formData} setFormData={setFormData} onSubmit={handleCreate} submitting={submitting} />
    </>
  );
}

function NewRFIDialog({ open, onClose, formData, setFormData, onSubmit, submitting }: {
  open: boolean;
  onClose: () => void;
  formData: { title: string; category: string; priority: string; description: string };
  setFormData: (d: typeof formData) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raise New RFI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Missing contribution statement" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe what's needed…" className="min-h-[100px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onSubmit} disabled={!formData.title.trim() || submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create RFI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
