import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const CODES = ["EUR","USD","GBP","CHF","CAD","AUD","JPY","NOK","SEK","DKK","PLN","CZK","HUF","RON","TRY","ZAR"];

export default function DisplayCurrencyDialog({
  open,
  onOpenChange,
  initial = "EUR",
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: string;
  onSave: (code: string) => Promise<void> | void;
}) {
  const [code, setCode] = useState(initial || "EUR");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Default display currency</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={code} onValueChange={setCode}>
            <SelectTrigger><SelectValue placeholder="Pick currency" /></SelectTrigger>
            <SelectContent>
              {CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={async () => { await onSave(code); onOpenChange(false); }}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
