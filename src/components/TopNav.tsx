import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Plus, User, LogOut, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewAuditModal } from "@/components/NewAuditModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  message: string;
  time: Date;
  link: string;
}

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const [openRfiCount, setOpenRfiCount] = useState(0);
  const [auditCount, setAuditCount] = useState(0);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || "User";

  const fetchCounts = async () => {
    if (!user) return;
    const [rfiRes, auditRes] = await Promise.all([
      supabase.from("rfis").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("audits").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "complete"),
    ]);
    setOpenRfiCount(rfiRes.count ?? 0);
    setAuditCount(auditRes.count ?? 0);
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [rfisRes, auditsRes] = await Promise.all([
      supabase
        .from("rfis")
        .select("id, title, audit_id, status, created_at, audits(fund_name)")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false }),
      supabase
        .from("audits")
        .select("id, fund_name, status, updated_at")
        .eq("user_id", user.id)
        .gte("updated_at", thirtyDaysAgo.toISOString())
        .order("updated_at", { ascending: false }),
    ]);

    const items: Notification[] = [];

    // Group new RFIs by audit
    if (rfisRes.data) {
      const byAudit: Record<string, { count: number; fundName: string; auditId: string; latest: Date }> = {};
      for (const rfi of rfisRes.data) {
        const fundName = (rfi.audits as any)?.fund_name || "Unknown Fund";
        if (!byAudit[rfi.audit_id]) {
          byAudit[rfi.audit_id] = { count: 0, fundName, auditId: rfi.audit_id, latest: new Date(rfi.created_at!) };
        }
        byAudit[rfi.audit_id].count++;
        const d = new Date(rfi.created_at!);
        if (d > byAudit[rfi.audit_id].latest) byAudit[rfi.audit_id].latest = d;
      }
      for (const key of Object.keys(byAudit)) {
        const g = byAudit[key];
        items.push({
          id: `new-rfis-${key}`,
          message: `${g.count} new RFI${g.count > 1 ? "s" : ""} raised for ${g.fundName}`,
          time: g.latest,
          link: `/audits/${g.auditId}?tab=rfis`,
        });
      }

      // Overdue RFIs (open > 7 days)
      const overdueRfis = rfisRes.data.filter(
        (r) => r.status === "open" && new Date(r.created_at!) < sevenDaysAgo
      );
      if (overdueRfis.length > 0) {
        const byAuditOverdue: Record<string, { count: number; fundName: string; auditId: string; latest: Date }> = {};
        for (const rfi of overdueRfis) {
          const fundName = (rfi.audits as any)?.fund_name || "Unknown Fund";
          if (!byAuditOverdue[rfi.audit_id]) {
            byAuditOverdue[rfi.audit_id] = { count: 0, fundName, auditId: rfi.audit_id, latest: new Date(rfi.created_at!) };
          }
          byAuditOverdue[rfi.audit_id].count++;
        }
        for (const key of Object.keys(byAuditOverdue)) {
          const g = byAuditOverdue[key];
          items.push({
            id: `overdue-rfis-${key}`,
            message: `${g.count} overdue RFI${g.count > 1 ? "s" : ""} for ${g.fundName}`,
            time: g.latest,
            link: `/audits/${g.auditId}?tab=rfis`,
          });
        }
      }
    }

    // Audit status changes
    if (auditsRes.data) {
      for (const audit of auditsRes.data) {
        if (audit.status && audit.status !== "pending") {
          items.push({
            id: `audit-status-${audit.id}`,
            message: `${audit.fund_name} status changed to ${audit.status}`,
            time: new Date(audit.updated_at!),
            link: `/audits/${audit.id}`,
          });
        }
      }
    }

    // Sort by time descending
    items.sort((a, b) => b.time.getTime() - a.time.getTime());
    setNotifications(items);
    if (items.length > 0) setHasUnread(true);
  }, [user]);

  const fetchCredits = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`https://auditron-server-production.up.railway.app/stripe/balance/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.audit_price_cents === 0) {
          setCreditBalance(-1); // sentinel for free account
        } else {
          setCreditBalance(data.credits ?? data.balance ?? 0);
        }
      }
    } catch (e) {
      console.error("Failed to fetch credit balance", e);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();
    fetchNotifications();
    fetchCredits();
  }, [user, location.key, fetchNotifications, fetchCredits]);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);

  const handleBellClick = () => {
    setBellOpen((prev) => {
      if (!prev) setHasUnread(false);
      return !prev;
    });
  };

  const handleNotificationClick = (link: string) => {
    setBellOpen(false);
    navigate(link);
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `relative px-3 py-1.5 text-sm font-medium transition-colors duration-100 ${
      isActive(path)
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex h-14 items-center justify-between" style={{ paddingLeft: "32px", paddingRight: "32px", maxWidth: "1200px", margin: "0 auto" }}>
          {/* Logo — text only */}
          <Link to="/dashboard" className="flex items-center">
            <span className="text-base font-bold tracking-tight text-foreground">
              Auditron
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            <Link to="/dashboard" className={navLinkClass("/dashboard")}>
              Dashboard
              {isActive("/dashboard") && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground" />}
            </Link>
            <Link to="/audits" className={navLinkClass("/audits")}>
              My Audits
              {isActive("/audits") && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground" />}
            </Link>
            <Link to="/rfis" className={navLinkClass("/rfis")}>
              My RFIs
              {isActive("/rfis") && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground" />}
            </Link>
            {profile?.is_admin && (
              <Link to="/admin" className={navLinkClass("/admin")}>
                Admin
                {isActive("/admin") && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground" />}
              </Link>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Credit Balance */}
            {creditBalance !== null && creditBalance === -1 ? (
              <div className="flex items-center gap-1.5 mr-1">
                <Coins className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">Free Account</span>
              </div>
            ) : creditBalance !== null ? (
              <div className="flex items-center gap-1.5 mr-1">
                <Coins className={`h-4 w-4 ${creditBalance === 0 ? 'text-red-500' : creditBalance <= 2 ? 'text-amber-500' : 'text-green-500'}`} />
                <span className={`text-sm font-medium ${creditBalance === 0 ? 'text-red-500' : creditBalance <= 2 ? 'text-amber-500' : 'text-green-500'}`}>
                  Credits: {creditBalance}
                </span>
                <Link to="/buy-credits">
                  <Button size="sm" variant="default" className="ml-1 h-7 text-xs px-3">
                    Buy Credits
                  </Button>
                </Link>
              </div>
            ) : null}

            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              New Audit
            </Button>

            {/* Notification Bell */}
            <div ref={bellRef} className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
                onClick={handleBellClick}
              >
                <Bell className="h-4 w-4" />
                {hasUnread && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-status-fail" />
                )}
              </Button>

              {bellOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-[360px] max-h-[400px] overflow-y-auto rounded-lg border bg-background shadow-lg z-50"
                  style={{ borderColor: "#e5e5e5" }}
                >
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  ) : (
                    <div className="py-1">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n.link)}
                          className="w-full text-left px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-b-0 hover:bg-[#f9f9f9]"
                        >
                          <p className="text-sm text-foreground leading-snug">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(n.time, { addSuffix: true })}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 transition-colors hover:bg-hover">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                    <User className="h-3 w-3 text-background" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{displayName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
      <NewAuditModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
