import { useState } from "react";
import { Search, Send, CheckCircle2, Paperclip, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type RFI, type RFIStatus } from "@/lib/mockData";

type TabFilter = "Open" | "Overdue" | "Resolved" | "All";

const statusBadgeVariant = (s: RFIStatus) => {
  if (s === "Open") return "new" as const;
  if (s === "Overdue") return "fail" as const;
  return "pass" as const;
};

const priorityVariant = (p: string) => {
  if (p === "High") return "high" as const;
  if (p === "Med") return "medium" as const;
  return "low" as const;
};

interface RFISplitPanelProps {
  rfis: RFI[];
  showRaiseButton?: boolean;
  className?: string;
}

export function RFISplitPanel({ rfis: allRfis, showRaiseButton, className }: RFISplitPanelProps) {
  const [tab, setTab] = useState<TabFilter>("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(allRfis[0]?.id || "");

  const counts: Record<TabFilter, number> = {
    Open: allRfis.filter(r => r.status === "Open").length,
    Overdue: allRfis.filter(r => r.status === "Overdue").length,
    Resolved: allRfis.filter(r => r.status === "Resolved").length,
    All: allRfis.length,
  };

  const filtered = (() => {
    let list = allRfis;
    if (tab !== "All") list = list.filter(r => r.status === tab);
    if (search) list = list.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.fundName.toLowerCase().includes(search.toLowerCase()));
    return list;
  })();

  const selected = allRfis.find(r => r.id === selectedId) || allRfis[0];

  if (allRfis.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No RFIs found.
      </div>
    );
  }

  return (
    <div className={`flex rounded-xl bg-card overflow-hidden ${className || ""}`} style={{ boxShadow: "var(--shadow-card)" }}>
      {/* Left Panel */}
      <div className="flex w-80 shrink-0 flex-col border-r lg:w-96">
        {/* Search + Raise Button */}
        <div className="p-3 border-b flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search RFIs…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {showRaiseButton && (
            <Button variant="accent" size="sm" className="shrink-0">
              <Plus className="h-4 w-4" />
              Raise RFI
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(["Open", "Overdue", "Resolved", "All"] as TabFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                tab === t ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
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
              className={`w-full text-left px-4 py-3.5 border-b transition-all duration-150 ${
                selectedId === rfi.id
                  ? "bg-accent/[0.06] border-l-2 border-l-accent"
                  : "hover:bg-muted/30 border-l-2 border-l-transparent"
              }`}
            >
              <div className="text-sm font-medium leading-snug line-clamp-1">{rfi.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{rfi.fundName}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant={priorityVariant(rfi.priority)} className="text-[10px] px-1.5 py-0">{rfi.priority}</Badge>
                <Badge variant={statusBadgeVariant(rfi.status)} className="text-[10px] px-1.5 py-0">{rfi.status}</Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">{rfi.timeAgo}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      {selected && (
        <div className="flex flex-1 flex-col">
          {/* Detail Header */}
          <div className="border-b p-5">
            <h2 className="font-serif-display text-lg font-semibold">{selected.title}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
              <span>Fund: <span className="text-foreground font-medium">{selected.fundName}</span></span>
              <Badge variant={priorityVariant(selected.priority)}>{selected.priority}</Badge>
              <Badge variant="secondary">{selected.category}</Badge>
              <span>Raised: {selected.dateRaised}</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {selected.messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === "accountant" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    msg.senderType === "auditor"
                      ? "bg-muted"
                      : "bg-sage-light"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  {msg.attachments?.map(file => (
                    <div key={file} className="flex items-center gap-1.5 mt-2 text-xs text-accent font-medium cursor-pointer hover:underline">
                      <Paperclip className="h-3 w-3" />
                      {file}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                    <span className="font-medium">{msg.sender}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Footer */}
          <div className="border-t p-4 flex items-center gap-2">
            <Input placeholder="Type your reply…" className="flex-1" />
            <Button variant="accent" size="sm"><Send className="h-4 w-4 mr-1.5" />Send</Button>
            <Button variant="accent-outline" size="sm"><CheckCircle2 className="h-4 w-4 mr-1.5" />Resolve</Button>
          </div>
        </div>
      )}
    </div>
  );
}
