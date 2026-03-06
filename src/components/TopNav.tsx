import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, Plus, User, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewAuditModal } from "@/components/NewAuditModal";

export function TopNav() {
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive(path)
        ? "text-nav-foreground"
        : "text-nav-foreground/60 hover:text-nav-foreground"
    }`;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-nav" style={{ boxShadow: "var(--shadow-nav)" }}>
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-nav-accent">
              <ClipboardCheck className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="font-serif-display text-lg font-semibold tracking-tight text-nav-foreground">
              AI <span className="text-nav-accent">Audits</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            <Link to="/" className={navLinkClass("/")}>
              Dashboard
              {isActive("/") && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-nav-accent" />}
            </Link>
            <Link to="/audits" className={navLinkClass("/audits")}>
              My Audits
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px] bg-nav-foreground/15 text-nav-foreground border-0">8</Badge>
              {isActive("/audits") && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-nav-accent" />}
            </Link>
            <Link to="/rfis" className={navLinkClass("/rfis")}>
              My RFIs
              <Badge variant="flag" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">4</Badge>
              {isActive("/rfis") && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-nav-accent" />}
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <Button variant="accent" size="sm" onClick={() => setModalOpen(true)} className="shadow-md">
              <Plus className="h-4 w-4" />
              New Audit
            </Button>
            <Button variant="ghost" size="icon" className="relative text-nav-foreground/70 hover:text-nav-foreground hover:bg-nav-foreground/10">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <div className="flex items-center gap-2 rounded-full bg-nav-foreground/10 px-2.5 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-nav-accent">
                <User className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              <span className="text-sm font-medium text-nav-foreground">James M.</span>
            </div>
          </div>
        </div>
      </nav>
      <NewAuditModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
