import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  currentBalance: number;
  onSuccess?: () => void;
}

export default function BalanceAdjustment({ currentBalance, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>(currentBalance.toFixed(2));
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const { toast } = useToast();
  const { user } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Not signed in", description: "You must be signed in to adjust balance", variant: "destructive" });
      return;
    }

    const entered = Number(value.replace(/[^0-9.-]+/g, ""));
    if (Number.isNaN(entered)) {
      toast({ title: "Invalid amount", description: "Please enter a valid number", variant: "destructive" });
      return;
    }

    const diff = +(entered - currentBalance).toFixed(2);

    if (diff === 0) {
      toast({ title: "No change", description: "Entered balance matches current balance", variant: "default" });
      setOpen(false);
      return;
    }

    // Build a corrective transaction so net_flow equals the difference
    const isIncome = diff > 0;
    const insertTx: any = {
      user_id: user.id,
      date,
      category: isIncome ? "Misc" : "Misc",
      description: isIncome ? "RECTIFIED BALANCE INCOME" : "RECTIFIED BALANCE EXPENSE",
      account: "Adjustment",
      payment_method: "Adjustment",
      gross_income: 0,
      net_income: 0,
      tax_paid: 0,
      expense: 0,
    };

    if (isIncome) {
      insertTx.net_income = diff;
      insertTx.gross_income = diff;
    } else {
      insertTx.expense = Math.abs(diff);
    }

    try {
      const { data: txData, error: txError } = await supabase.from("transactions").insert([insertTx]).select("id").single();
      if (txError) throw txError;

      const txId = txData.id;

      // record adjustment
      const { error: adjError } = await (supabase as any).from("balance_adjustments").insert([
        {
          user_id: user.id,
          transaction_id: txId,
          amount: diff,
          as_of: date,
          note: `Rectified to €${entered.toFixed(2)}`,
        },
      ]);
      if (adjError) throw adjError;

      toast({ title: "Balance adjusted", description: `Adjusted by €${diff.toFixed(2)}` });
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">Rectify Balance</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rectify current balance</DialogTitle>
          <DialogDescription>Enter the correct current balance. A corrective transaction will be created to reconcile the difference.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 py-4">
          <div>
            <Label htmlFor="balance">Current balance</Label>
            <Input id="balance" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="date">As of date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save Adjustment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
