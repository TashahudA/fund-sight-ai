import { useState } from "react";
import { Search, Send, CheckCircle2, Paperclip, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { rfis, type RFI, type RFIStatus } from "@/lib/mockData";

type TabFilter = "Open" | "Overdue" | "Resolved" | "All";

const counts: Record<TabFilter, number> = {
  Open: rfis.filter(r => r.status === "Open").length,
  Overdue: rfis.filter(r => r.status === "Overdue").length,
  Resolved: rfis.filter(r => r.status === "Resolved").length,
  All: rfis.length,
};

const filterRfis = (tab: TabFilter, search: string) => {
  let list = rfis;
  if (tab !== "All") list = list.filter(r => r.status === tab);
  if (search) list = list.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.fundName.toLowerCase().includes(search.toLowerCase()));
  return list;
};

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

export default function MyRFIs() {
  const [tab, setTab] = useState<TabFilter>("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(rfis[0].id);

  const filtered = filterRfis(tab, search);
  const selected = rfis.find(r => r.id === selectedId) || rfis[0];

  return (
    <div className="container max-w-6xl py-6 animate-fade-in">
      <div className="flex h-[calc(100vh-7rem)] rounded-xl border bg-card overflow-hidden">
        {/* Left Panel */}
        <div className="flex w-80 shrink-0 flex-col border-r lg:w-96">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search RFIs…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
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
                className={`w-full text-left px-4 py-3.5 border-b transition-colors ${
                  selectedId === rfi.id
                    ? "bg-accent/5 border-l-2 border-l-accent"
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
      </div>
    </div>
  );
}
