import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CloudUpload, Zap } from "lucide-react";

interface NewAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAuditModal({ open, onOpenChange }: NewAuditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif-display text-xl">Start New SMSF Audit</DialogTitle>
          <DialogDescription>Upload the fund pack and we'll run AI-powered compliance analysis.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fundName">Fund Name</Label>
              <Input id="fundName" placeholder="e.g. Smith Family Super Fund" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="abn">ABN</Label>
              <Input id="abn" placeholder="XX XXX XXX XXX" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Financial Year</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2023-24">2023-24</SelectItem>
                  <SelectItem value="2022-23">2022-23</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fund Type</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="accumulation">Accumulation</SelectItem>
                  <SelectItem value="pension">Pension</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="firm">Accountant / Firm (optional)</Label>
            <Input id="firm" placeholder="e.g. BDO Australia" />
          </div>

          {/* Upload zone */}
          <div className="space-y-2">
            <Label>Upload Fund Pack</Label>
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input p-8 text-center transition-colors hover:border-accent hover:bg-accent/5 cursor-pointer">
              <CloudUpload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground">PDF, XLSX, CSV, JPG, PNG accepted</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="accent" className="gap-2">
            <Zap className="h-4 w-4" />
            Run AI Audit — $20
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
