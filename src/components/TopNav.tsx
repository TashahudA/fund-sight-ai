import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Plus, User, LogOut } from "lucide-react";
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
  const [modalOpen, setModalOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const [openRfiCount, setOpenRfiCount] = useState(0);
  const [auditCount, setAuditCount] = useState(0);

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

  useEffect(() => {
    fetchCounts();
  }, [user, location.key]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
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
        <div className="container flex h-14 items-center justify-between">
          {/* Logo — text only */}
          <Link to="/" className="flex items-center">
            <span className="text-base font-bold tracking-tight text-foreground">
              Auditron
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            <Link to="/" className={navLinkClass("/")}>
              Dashboard
              {isActive("/") && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground" />}
            </Link>
            <Link to="/audits" className={navLinkClass("/audits")}>
              My Audits
              {isActive("/audits") && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground" />}
            </Link>
            <Link to="/rfis" className={navLinkClass("/rfis")}>
              My RFIs
              {openRfiCount > 0 && <Badge variant="flag" className="ml-1.5 text-[10px] px-1.5 py-0">{openRfiCount}</Badge>}
              {isActive("/rfis") && <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground" />}
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              New Audit
            </Button>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-status-fail" />
            </Button>

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
