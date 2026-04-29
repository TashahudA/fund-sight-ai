import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, User, LogOut, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewAuditModal } from "@/components/NewAuditModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const [openRfiCount, setOpenRfiCount] = useState(0);
  const [auditCount, setAuditCount] = useState(0);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

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

  const fetchCredits = useCallback(async () => {
    if (!user) return;
    console.log("[fetchCredits] reading profiles.credit_balance for user_id:", user.id);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credit_balance, audit_price_cents")
        .eq("id", user.id)
        .single();
      console.log("[fetchCredits] response:", { data, error });
      if (error) {
        console.warn("[fetchCredits] error", error);
        return;
      }
      if (data?.audit_price_cents === 0) {
        setCreditBalance(-1); // sentinel for free account
      } else {
        setCreditBalance(data?.credit_balance ?? 0);
      }
    } catch (e) {
      console.error("Failed to fetch credit balance", e);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    fetchCounts();
    fetchCredits();
  }, [user?.id, location.key, fetchCredits]);

  // Handle Stripe payment success redirect
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "success") {
      fetchCredits();
      toast.success("Credits added! Your balance has been updated.");
      params.delete("payment");
      const newSearch = params.toString();
      navigate(
        { pathname: location.pathname, search: newSearch ? `?${newSearch}` : "" },
        { replace: true }
      );
    }
  }, [user, location.search, location.pathname, navigate, fetchCredits]);

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
