import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Paperclip, Send, CheckCircle2, Loader2, MessageSquare, Bot, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type TabFilter = "open" | "overdue" | "resolved" | "all";

interface RFIWithAudit {
  id: string;
  audit_id: string;
  title: string;
  category: string | null;
  priority: string | null;
  status: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  fund_name: string;
}

interface RFIMessage {
  id: string;
  rfi_id: string;
  message: string;
  sender: string;
  created_at: string | null;
}

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

export default function MyRFIs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email || "You";

  const [rfis, setRfis] = useState<RFIWithAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RFIMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [aiReviewing, setAiReviewing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchRfis = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("rfis")
      .select("*, audits(fund_name)")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching RFIs:", error);
      setLoading(false);
      return;
    }
    const mapped: RFIWithAudit[] = (data || []).map((r: any) => ({
      id: r.id,
      audit_id: r.audit_id,
      title: r.title,
      category: r.category,
      priority: r.priority,
      status: r.status,
      description: r.description,
      created_at: r.created_at,
      updated_at: r.updated_at,
      fund_name: r.audits?.fund_name || "Unknown Fund",
    }));
    setRfis(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchRfis();
  }, [user, location.key]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedId) return;
    const messageText = replyText.trim();
    const selectedRfi = rfis.find(r => r.id === selectedId);
    if (!selectedRfi) return;
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
      const { error: fnError } = await supabase.functions.invoke("dynamic-processor", {
        body: {
          audit_id: selectedRfi.audit_id,
          mode: "rfi_chat",
          rfi_id: selectedId,
          message: messageText,
        },
      });
      if (fnError) throw fnError;
      await Promise.all([fetchMessages(selectedId), fetchRfis()]);
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
    }
    setResolving(false);
  };

  const isOverdue = (rfi: RFIWithAudit) => {
    if (rfi.status !== "open" || !rfi.created_at) return false;
    return Date.now() - new Date(rfi.created_at).getTime() > 7 * 24 * 60 * 60 * 1000;
  };

  const counts = {
    open: rfis.filter(r => r.status === "open").length,
    overdue: rfis.filter(r => isOverdue(r)).length,
    resolved: rfis.filter(r => r.status === "resolved").length,
    all: rfis.length,
  };

  const filtered = (() => {
    let list = rfis;
    if (tab === "open") list = list.filter(r => r.status === "open");
    else if (tab === "overdue") list = list.filter(r => isOverdue(r));
    else if (tab === "resolved") list = list.filter(r => r.status === "resolved");
    if (search) list = list.filter(r =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.fund_name.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  })();

  const selected = rfis.find(r => r.id === selectedId);

  if (loading) {
    return (
      <div className="container max-w-6xl py-8 animate-fade-in">
        <h1 className="text-xl font-bold mb-6">My RFIs</h1>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (rfis.length === 0) {
    return (
      <div className="container max-w-6xl py-8 animate-fade-in">
        <h1 className="text-xl font-bold mb-6">My RFIs</h1>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <MessageSquare className="h-10 w-10 text-border mb-3" />
          <p className="text-sm text-muted-foreground">No RFIs found across your audits.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 animate-fade-in">
      <h1 className="text-xl font-bold mb-6">My RFIs</h1>

      <div className="flex rounded-lg border border-border bg-background overflow-hidden min-h-[600px] h-[calc(100vh-10rem)]">
        {/* Left Panel */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border lg:w-[380px]">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search RFIs…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {(["open", "overdue", "resolved", "all"] as TabFilter[]).map(t => (
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

          {/* List */}
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
                <div className="text-xs text-muted-foreground mt-0.5">{rfi.fund_name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={priorityVariant(rfi.priority)} className="text-[10px] px-1.5 py-0 capitalize">{rfi.priority || "medium"}</Badge>
                  <Badge variant={statusBadgeVariant(rfi.status)} className="text-[10px] px-1.5 py-0 capitalize">{rfi.status || "open"}</Badge>
                  {isOverdue(rfi) && <Badge variant="fail" className="text-[10px] px-1.5 py-0">Overdue</Badge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {rfi.updated_at || rfi.created_at
                      ? formatDistanceToNow(new Date(rfi.updated_at || rfi.created_at!), { addSuffix: true })
                      : ""}
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
              {/* Header */}
              <div className="border-b border-border p-5">
                <h2 className="text-base font-semibold">{selected.title}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                  <span>
                    Fund:{" "}
                    <button
                      onClick={() => navigate(`/audits/${selected.audit_id}`)}
                      className="text-foreground font-medium hover:underline"
                    >
                      {selected.fund_name}
                    </button>
                  </span>
                  <Badge variant={priorityVariant(selected.priority)} className="capitalize">{selected.priority || "medium"}</Badge>
                  <Badge variant="secondary" className="capitalize">{selected.category || "Uncategorized"}</Badge>
                  <Badge variant={statusBadgeVariant(selected.status)} className="capitalize">{selected.status || "open"}</Badge>
                  <span className="text-xs">
                    Raised: {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                {selected.description && (
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{selected.description}</p>
                )}
              </div>

              {/* Messages */}
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
                    const bgColor = isAI ? "#f0f4ff" : isAuditor ? "#f4f4f4" : "#f0fdf4";
                    const senderLabel = isAI ? "Auditron" : isAuditor ? displayName : msg.sender;

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
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Footer */}
              <div className="border-t border-border flex items-center gap-3" style={{ padding: "16px" }}>
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
    </div>
  );
}
