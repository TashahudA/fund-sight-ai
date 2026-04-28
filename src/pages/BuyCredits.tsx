import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Coins, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { API_BASE_URL as API } from "@/lib/apiConfig";

export default function BuyCredits() {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [isFreeAccount, setIsFreeAccount] = useState(false);
  const [customCredits, setCustomCredits] = useState("");

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/stripe/balance/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.credits ?? data.balance ?? 0);
        const price = data.audit_price_cents;
        if (price === 0) {
          setIsFreeAccount(true);
        } else {
          setPriceCents(price ?? 2900);
        }
      }
    } catch {}
  }, [user]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "success") {
      toast({ title: "Payment successful!", description: "Credits have been added to your account." });
      window.history.replaceState({}, "", location.pathname);
      fetchBalance();
    }
  }, [location.search, fetchBalance]);

  const handleBuy = async (packageId: string, customCount?: number) => {
    if (!user) return;
    setLoading(packageId);
    try {
      const body: any = { user_id: user.id, package_id: packageId };
      if (packageId === "custom" && customCount) body.custom_credits = customCount;
      const res = await fetch(`${API}/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to start checkout");
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const customNum = parseInt(customCredits) || 0;
  const unitPrice = (priceCents ?? 2900) / 100;

  const packs = [
    { id: "single", credits: 1, price: unitPrice, perAudit: "Pay per fund", label: "1 Audit Credit" },
    { id: "pack_5", credits: 5, price: unitPrice * 5, perAudit: `$${unitPrice.toFixed(2)} per audit`, label: "5 Audit Credits" },
    { id: "pack_10", credits: 10, price: unitPrice * 10, perAudit: `$${unitPrice.toFixed(2)} per audit`, label: "10 Audit Credits" },
    {
      id: "pack_50", credits: 50,
      price: +(unitPrice * 50 * 0.8).toFixed(2),
      originalPrice: +(unitPrice * 50).toFixed(2),
      perAudit: `$${(unitPrice * 0.8).toFixed(2)} per audit · Save 20%`,
      label: "50 Audit Credits", badge: "Best Value", highlighted: true,
    },
  ];

  // Free account view
  if (isFreeAccount) {
    return (
      <>
        <TopNav />
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <Coins className="h-10 w-10 mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Free Account</h1>
          <p className="text-muted-foreground">Your account has unlimited audits — no credits required.</p>
        </div>
      </>
    );
  }

  // Wait for price to load
  if (priceCents === null) {
    return (
      <>
        <TopNav />
        <div className="mx-auto max-w-5xl px-6 py-24 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Coins className="h-6 w-6 text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Buy Audit Credits</h1>
          </div>
          {balance !== null && (
            <Badge variant="outline" className="text-sm px-3 py-1.5">
              Current Balance: <span className="font-bold ml-1">{balance} credit{balance !== 1 ? "s" : ""}</span>
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-10">
          1 credit = 1 fund. Once a fund is paid for, you can re-run the audit unlimited times.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {packs.map((pack) => (
            <div
              key={pack.id}
              onClick={() => !loading && handleBuy(pack.id)}
              className={`relative flex flex-col rounded-lg border p-6 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                pack.highlighted
                  ? "border-foreground bg-foreground text-background ring-1 ring-foreground"
                  : "border-border bg-background text-foreground hover:border-foreground/30"
              }`}
            >
              {pack.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[11px] font-semibold px-3 py-0.5 rounded-full whitespace-nowrap">
                  {pack.badge}
                </span>
              )}
              <p className={`text-sm font-medium text-center mb-4 ${pack.highlighted ? "text-background/70" : "text-muted-foreground"}`}>
                {pack.label}
              </p>
              <div className="text-center mb-1">
                {pack.originalPrice && (
                  <span className={`text-lg line-through mr-2 ${pack.highlighted ? "text-background/40" : "text-muted-foreground/50"}`}>
                    ${pack.originalPrice.toLocaleString()}
                  </span>
                )}
                <span className="text-4xl font-bold">${pack.price.toLocaleString()}</span>
              </div>
              <p className={`text-xs text-center mb-6 ${pack.highlighted ? "text-background/60" : "text-muted-foreground"}`}>
                {pack.perAudit}
              </p>
              <Button
                className={`w-full mt-auto ${pack.highlighted ? "bg-background text-foreground hover:bg-background/90" : ""}`}
                variant={pack.highlighted ? "outline" : "default"}
                disabled={loading !== null}
              >
                {loading === pack.id ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Redirecting…</>
                ) : (
                  "Buy Now"
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-5 py-4 mb-10">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Need a different amount?</span>
          <Input
            type="number"
            min="1"
            placeholder="Credits"
            value={customCredits}
            onChange={(e) => setCustomCredits(e.target.value)}
            className="w-28"
          />
          {customNum > 0 && (
            <span className="text-sm font-medium text-foreground whitespace-nowrap">
              = ${(customNum * unitPrice).toLocaleString()}
            </span>
          )}
          <Button
            disabled={customNum < 1 || loading !== null}
            onClick={(e) => { e.stopPropagation(); handleBuy("custom", customNum); }}
            size="sm"
          >
            {loading === "custom" ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" />Redirecting…</>
            ) : (
              "Buy"
            )}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Secure payment via Stripe</span>
          <span>·</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Credits never expire</span>
          <span>·</span>
          <span>1 credit = 1 fund</span>
        </div>
      </div>
    </>
  );
}
