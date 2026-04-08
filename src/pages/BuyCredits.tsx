import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const API = "https://auditron-server-production.up.railway.app";

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  perAudit: string;
  label: string;
  badge?: string;
}

const PACKS: CreditPack[] = [
  { id: "single", credits: 1, price: 29, perAudit: "Pay per fund", label: "1 Audit Credit" },
  { id: "pack_5", credits: 5, price: 145, perAudit: "$29/audit", label: "5 Audit Credits" },
  { id: "pack_10", credits: 10, price: 290, perAudit: "$29/audit", label: "10 Audit Credits" },
  { id: "pack_50", credits: 50, price: 1160, perAudit: "$23.20/audit · Save 20%", label: "50 Audit Credits", badge: "Best Value" },
];

export default function BuyCredits() {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [customCredits, setCustomCredits] = useState("");

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API}/stripe/balance/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.credits ?? data.balance ?? 0);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Handle payment return
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
      if (packageId === "custom" && customCount) {
        body.custom_credits = customCount;
      }
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
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const customNum = parseInt(customCredits) || 0;

  return (
    <>
      <TopNav />
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Balance */}
        <div className="flex items-center gap-3 mb-8">
          <Coins className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Buy Audit Credits</h1>
          {balance !== null && (
            <Badge variant="outline" className="text-sm ml-auto px-3 py-1">
              Current Balance: <span className="font-bold ml-1">{balance} credit{balance !== 1 ? "s" : ""}</span>
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          1 credit = 1 fund. Once a fund is paid for, you can re-run the audit unlimited times.
        </p>

        {/* Package Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {PACKS.map((pack) => (
            <Card
              key={pack.id}
              className={`relative cursor-pointer transition-shadow hover:shadow-md ${
                pack.badge ? "border-primary ring-1 ring-primary" : ""
              }`}
              onClick={() => handleBuy(pack.id)}
            >
              {pack.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {pack.badge}
                </span>
              )}
              <CardHeader className="text-center pb-2 pt-6">
                <CardTitle className="text-base">{pack.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <p className="text-3xl font-bold text-foreground">${pack.price}</p>
                <p className="text-xs text-muted-foreground">{pack.perAudit}</p>
                <Button className="w-full" disabled={loading !== null} size="sm">
                  {loading === pack.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" />Redirecting...</>
                  ) : (
                    "Buy Now"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="rounded-lg border border-border bg-background p-6 max-w-md">
          <h3 className="font-semibold text-base mb-1">Custom Amount</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Need a specific number of credits? Enter any amount at $29/credit.
          </p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="1"
              placeholder="Number of credits"
              value={customCredits}
              onChange={(e) => setCustomCredits(e.target.value)}
              className="w-40"
            />
            {customNum > 0 && (
              <span className="text-sm font-medium text-foreground">
                = ${(customNum * 29).toLocaleString()}
              </span>
            )}
            <Button
              disabled={customNum < 1 || loading !== null}
              onClick={() => handleBuy("custom", customNum)}
              size="sm"
            >
              {loading === "custom" ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" />Redirecting...</>
              ) : (
                "Buy"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
