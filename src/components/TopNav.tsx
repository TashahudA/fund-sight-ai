import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewAuditModal } from "@/components/NewAuditModal";

export function TopNav() {
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">AI</span>
            </div>
            <span className="font-serif-display text-lg font-semibold tracking-tight">
              AI <span className="text-accent">Audits</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive("/") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My Audits
              <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">8</Badge>
              {isActive("/") && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-accent" />}
            </Link>
            <Link
              to="/rfis"
              className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive("/rfis") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My RFIs
              <Badge variant="flag" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-[10px]">4</Badge>
              {isActive("/rfis") && <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-accent" />}
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <Button variant="accent" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              New Audit
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <div className="flex items-center gap-2 rounded-full border bg-card px-2.5 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium">James M.</span>
            </div>
          </div>
        </div>
      </nav>
      <NewAuditModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
