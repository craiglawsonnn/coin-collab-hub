import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { CURRENCIES } from "@/lib/currencies";

type BudgetRow = {
  id: string;
  user_id: string;
  category: string | null;
  amount: number;
  currency_code: string;
  period: "weekly" | "monthly" | "yearly";
  is_active: boolean;
  created_at: string;
};

const OVERALL = "__overall__";

export default function Budgets() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [cats, setCats] = useState<string[]>([]);

  // form state
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [category, setCategory] = useState<string | undefined>(undefined); // undefined -> placeholder

  const fmtMoney = (v: number, ccy: string) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(v);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        setLoading(true);

        // categories (filter empty names)
        const { data: catData, error: catErr } = await supabase
          .from("user_categories")
          .select("category_name")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("category_name");

        if (catErr) throw catErr;
        setCats((catData ?? [])
          .map(c => (c.category_name || "").trim())
          .filter(Boolean));

        // budgets
        const { data: budData, error: budErr } = await supabase
          .from("budgets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (budErr) throw budErr;
        setRows((budData ?? []) as BudgetRow[]);
      } catch (e: any) {
        toast.error(e.message || "Failed to load budgets");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  // Serialize category for the Select (never empty)
  const categoryItems = useMemo(() => {
    // Provide an explicit "Overall" sentinel FIRST
    const list = [OVERALL, ...cats];
    // dedupe just in case
    return Array.from(new Set(list));
  }, [cats]);

  const resetForm = () => {
    setAmount("");
    setCurrency("EUR");
    setPeriod("monthly");
    setCategory(undefined); // back to placeholder
  };

  const handleCreate = async () => {
    try {
      if (!user?.id) throw new Error("Not signed in");
      const amt = parseFloat(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        toast.error("Enter a positive amount");
        return;
      }

      // map sentinel -> null
      const categoryForDb =
        category === OVERALL || !category ? null : category;

      const { error } = await supabase.from("budgets").insert({
        user_id: user.id,
        category: categoryForDb,
        amount: amt,
        currency_code: currency,
        period,
        is_active: true,
      });

      if (error) throw error;
      toast.success("Budget created");

      // reload rows quickly
      const { data: budData } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setRows((budData ?? []) as BudgetRow[]);
      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Failed to create budget");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setRows(prev => prev.filter(r => r.id !== id));
      toast.success("Budget deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete budget");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Budgets</h3>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">New budget</Button>
          </DialogTrigger>
          {/* ensure dropdowns can overflow, dialog is z-100 */}
          <DialogContent className="z-[100] overflow-visible">
            <DialogHeader>
              <DialogTitle>Create budget</DialogTitle>
              <DialogDescription>Set an overall or per-category budget.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              {/* Category (optional) */}
              <div className="grid gap-1.5">
                <Label>Category (optional)</Label>
                <Select
                  value={category ?? undefined}
                  onValueChange={(v) => setCategory(v)}
                >
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="Overall (no category)" />
                  </SelectTrigger>
                  {/* bump z-index so it floats above the dialog */}
                  <SelectContent className="z-[200]">
                    {categoryItems.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === OVERALL ? "Overall (no category)" : c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="grid gap-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-input"
                />
              </div>

              {/* Currency */}
              <div className="grid gap-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="EUR" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    {CURRENCIES.map((ccy) => (
                      <SelectItem key={ccy} value={ccy}>
                        {ccy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period */}
              <div className="grid gap-1.5">
                <Label>Period</Label>
                <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="monthly" />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={loading}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div className="flex flex-col">
              <span className="font-medium">
                {r.category ?? "Overall"}
              </span>
              <span className="text-xs text-muted-foreground capitalize">{r.period}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular-nums">
                {fmtMoney(r.amount, r.currency_code)}
              </span>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
        {!rows.length && (
          <p className="text-sm text-muted-foreground">No budgets yet.</p>
        )}
      </div>
    </Card>
  );
}
