import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Check, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProfileRow {
  id: string;
  full_name: string | null;
  firm_name: string | null;
  is_admin: boolean | null;
  audit_price_cents: number | null;
  credit_balance: number | null;
  created_at: string;
}

interface InviteRow {
  id: string;
  email: string | null;
  audit_price_cents: number | null;
  created_at: string | null;
  used_at: string | null;
  token: string;
}

export default function Admin() {
  const { profile, user, loading } = useAuth();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Edit price modal
  const [editingProfile, setEditingProfile] = useState<ProfileRow | null>(null);
  const [priceOption, setPriceOption] = useState("standard");
  const [customPrice, setCustomPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete account modal
  const [deletingProfile, setDeletingProfile] = useState<ProfileRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Add credits modal
  const [addCreditsProfile, setAddCreditsProfile] = useState<ProfileRow | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const [addingCredits, setAddingCredits] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePriceOption, setInvitePriceOption] = useState("standard");
  const [inviteCustomPrice, setInviteCustomPrice] = useState("");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    setLoadingData(true);
    const [profilesRes, invitesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("invite_links").select("*").order("created_at", { ascending: false }),
    ]);
    setProfiles(profilesRes.data ?? []);
    setInvites(invitesRes.data ?? []);
    setLoadingData(false);
  };

  useEffect(() => {
    if (profile?.is_admin) fetchData();
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  const getPriceCents = (option: string, custom: string): number | null => {
    if (option === "standard") return 2900;
    if (option === "free") return 0;
    const dollars = parseFloat(custom);
    if (isNaN(dollars) || dollars < 0) return null;
    return Math.round(dollars * 100);
  };

  const handleSavePrice = async () => {
    if (!editingProfile) return;
    const cents = getPriceCents(priceOption, customPrice);
    if (cents === null) {
      toast({ title: "Enter a valid positive dollar amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ audit_price_cents: cents })
      .eq("id", editingProfile.id);
    setSaving(false);
    if (error) {
      toast({ title: "Failed to update price", variant: "destructive" });
    } else {
      toast({ title: "Price updated" });
      setEditingProfile(null);
      fetchData();
    }
  };

  const handleOpenEdit = (p: ProfileRow) => {
    setEditingProfile(p);
    const cents = p.audit_price_cents ?? 2900;
    if (cents === 2900) setPriceOption("standard");
    else if (cents === 0) setPriceOption("free");
    else {
      setPriceOption("custom");
      setCustomPrice((cents / 100).toString());
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingProfile) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: deletingProfile.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Account deleted" });
      setDeletingProfile(null);
      fetchData();
    } catch (err: any) {
      toast({
        title: "Failed to delete account",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    }
    setDeleting(false);
  };

  const handleGenerateInvite = async () => {
    const cents = getPriceCents(invitePriceOption, inviteCustomPrice);
    if (cents === null) {
      toast({ title: "Enter a valid positive dollar amount", variant: "destructive" });
      return;
    }
    setGeneratingInvite(true);
    setGeneratedLink("");
    try {
      const res = await fetch("https://auditron-server-production.up.railway.app/admin/generate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          email: inviteEmail || undefined,
          audit_price_cents: cents,
        }),
      });
      const data = await res.json();
      if (data.link) {
        // Strip any double slashes from the path (caused by trailing slash in FRONTEND_URL)
        const cleanLink = data.link.replace(/([^:])\/\//g, "$1/");
        setGeneratedLink(cleanLink);
        fetchData();
      } else {
        toast({ title: "Failed to generate invite", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to generate invite", variant: "destructive" });
    }
    setGeneratingInvite(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>
        <h1 className="text-2xl font-bold text-foreground mb-8">Admin Panel</h1>

        {/* SECTION 1 — Accounts */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-foreground mb-4">Accounts</h2>
          {loadingData ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Firm</TableHead>
                    <TableHead>Audit Price</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell>{p.firm_name || "—"}</TableCell>
                      <TableCell>${((p.audit_price_cents ?? 2900) / 100).toFixed(0)}</TableCell>
                      <TableCell>
                        {p.is_admin ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(p)}>
                            Edit Price
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => setDeletingProfile(p)}
                            disabled={p.id === user?.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* SECTION 2 — Invite New Client */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Invite New Client</h2>
          <div className="rounded-lg border border-border p-6 mb-6 space-y-4 max-w-md">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email (optional)</label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Price</label>
              <Select value={invitePriceOption} onValueChange={setInvitePriceOption}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard ($29)</SelectItem>
                  <SelectItem value="free">Free ($0)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {invitePriceOption === "custom" && (
                <Input
                  className="mt-2"
                  type="number"
                  min="0"
                  placeholder="Dollar amount"
                  value={inviteCustomPrice}
                  onChange={(e) => setInviteCustomPrice(e.target.value)}
                />
              )}
            </div>
            <Button onClick={handleGenerateInvite} disabled={generatingInvite}>
              {generatingInvite ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generating…</> : "Generate Invite Link"}
            </Button>

            {generatedLink && (
              <div className="rounded-md border border-border bg-muted/50 p-3 flex items-center gap-2">
                <code className="text-sm text-foreground flex-1 break-all">{generatedLink}</code>
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>

          <h3 className="text-sm font-semibold text-foreground mb-3">Past Invites</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No invites yet</TableCell></TableRow>
                ) : invites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email || "—"}</TableCell>
                    <TableCell>${((inv.audit_price_cents ?? 2900) / 100).toFixed(0)}</TableCell>
                    <TableCell>{formatDate(inv.created_at)}</TableCell>
                    <TableCell>
                      {inv.used_at ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      {/* Edit Price Modal */}
      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Audit Price</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">{editingProfile?.full_name || "User"}</p>
          <Select value={priceOption} onValueChange={setPriceOption}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard ($29)</SelectItem>
              <SelectItem value="free">Free ($0)</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {priceOption === "custom" && (
            <Input
              className="mt-2"
              type="number"
              min="0"
              placeholder="Dollar amount"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
            />
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
            <Button onClick={handleSavePrice} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Modal */}
      <Dialog open={!!deletingProfile} onOpenChange={(open) => !open && setDeletingProfile(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingProfile?.full_name || "this user"}</strong>'s account? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeletingProfile(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
