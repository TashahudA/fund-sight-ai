import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const CREDIT_PACKS = [
  { credits: 5, price: 99, label: "5 Credits", priceLabel: "$99 AUD" },
  { credits: 10, price: 179, label: "10 Credits", priceLabel: "$179 AUD", popular: true },
  { credits: 25, price: 399, label: "25 Credits", priceLabel: "$399 AUD" },
];

export default function BuyCredits() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<number | null>(null);

  const handleBuy = async (pack: typeof CREDIT_PACKS[0], idx: number) => {
    if (!user) return;
    setLoading(idx);
    try {
      const res = await fetch("https://auditron-server-production.up.railway.app/stripe/buy-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ user_id: user.id, credits: pack.credits }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to start checkout");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Success", description: "Credits purchased!" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <TopNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">Buy Audit Credits</h1>
        <p className="text-muted-foreground mb-8">Each credit allows you to run one AI audit.</p>

        <div className="grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack, idx) => (
            <Card key={idx} className={`relative ${pack.popular ? "border-primary ring-1 ring-primary" : ""}`}>
              {pack.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Most Popular
                </span>
              )}
              <CardHeader className="text-center pb-2">
                <Coins className="h-8 w-8 mx-auto text-primary mb-2" />
                <CardTitle className="text-lg">{pack.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-foreground mb-4">{pack.priceLabel}</p>
                <Button
                  className="w-full"
                  onClick={() => handleBuy(pack, idx)}
                  disabled={loading !== null}
                >
                  {loading === idx ? "Redirecting..." : "Buy Now"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
