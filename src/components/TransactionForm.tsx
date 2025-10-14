import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TransactionFormProps {
  onClose: () => void;
  onSuccess?: (id?: string) => void;
}

type AccountRow = {
  id: string;
  account_name: string;
  currency_code: string; // char(3)
};

export const TransactionForm = ({ onClose, onSuccess }: TransactionFormProps) => {
  const { user } = useAuth();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "",
    description: "",
    accountId: "",             // store account ID (not name)
    paymentMethod: "",
    grossIncome: "",
    netIncome: "",
    taxPaid: "",
    expense: "",
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [accountCurrency, setAccountCurrency] = useState<string>("EUR");
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      if (!user?.id) return;
      try {
        const [categoriesRes, accountsRes] = await Promise.all([
          supabase
            .from("user_categories")
            .select("category_name")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("category_name"),
          supabase
            .from("user_accounts")
            .select("id, account_name, currency_code")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("account_name"),
        ]);

        if (categoriesRes.data) {
          setCategories(categoriesRes.data.map((c) => c.category_name));
        }
        if (accountsRes.data) {
          setAccounts(accountsRes.data as AccountRow[]);
        }
      } catch (err) {
        console.error("Error loading options:", err);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, [user?.id]);

  // When account changes, update currency display
  useEffect(() => {
    const acc = accounts.find((a) => a.id === formData.accountId);
    setAccountCurrency(acc?.currency_code ?? "EUR");
  }, [formData.accountId, accounts]);

  function toMinor(value: string) {
    const n = parseFloat(value);
    if (!isFinite(n)) return 0;
    return Math.round(n * 100);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");

      const isIncome = type === "income";
      const acc = accounts.find((a) => a.id === formData.accountId);
      if (!acc) throw new Error("Choose an account");

      // signed amount in minor units
      const major = isIncome
        ? parseFloat(formData.netIncome || formData.grossIncome || "0") || 0
        : parseFloat(formData.expense || "0") || 0;

      const signedMinor = (isIncome ? 1 : -1) * Math.round(Math.abs(major) * 100);

      const { data: inserted, error } = await supabase
        .from("transactions")
        .insert({
          user_id: auth.user.id,
          date: formData.date,
          category: formData.category,
          description: formData.description,
          // If your schema still stores account NAME, keep this for now:
          account: acc.account_name,
          // Recommended long-term: also add account_id column and use it.
          payment_method: formData.paymentMethod || null,

          // --- currency-aware fields ---
          currency_code: acc.currency_code,      // new column on transactions
          amount_minor: signedMinor,             // new column on transactions

          // keep existing numeric columns so current UI stays happy
          gross_income: isIncome ? parseFloat(formData.grossIncome) || 0 : 0,
          net_income:  isIncome ? parseFloat(formData.netIncome)  || 0 : 0,
          tax_paid:    isIncome ? parseFloat(formData.taxPaid)    || 0 : 0,
          expense:     !isIncome ? parseFloat(formData.expense)   || 0 : 0,
        })
        .select("id");

      if (error) throw error;

      const newId = Array.isArray(inserted) && inserted[0] ? inserted[0].id : undefined;
      toast({ title: "Transaction added successfully!" });
      onSuccess?.(newId);
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const PAYMENT_METHODS = ["Card", "Cash", "Bank transfer", "Revolut", "Crypto", "Other"];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95">
        <div className="sticky top-0 bg-card border-b p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold">Add Transaction</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={type === "expense" ? "default" : "outline"}
              onClick={() => setType("expense")}
              className={type === "expense" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === "income" ? "default" : "outline"}
              onClick={() => setType("income")}
              className={type === "income" ? "bg-success hover:bg-success/90" : ""}
            >
              Income
            </Button>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="bg-input"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
              disabled={loadingOptions}
            >
              <SelectTrigger className="bg-input">
                <SelectValue placeholder={loadingOptions ? "Loading..." : "Select category"} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {categories.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No categories. Add them in Settings.</div>
                ) : (
                  categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What's this for?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-input"
            />
          </div>

          {/* Account + Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Account</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                required
                disabled={loadingOptions}
              >
                <SelectTrigger className="bg-input">
                  <SelectValue placeholder={loadingOptions ? "Loading..." : "Select account"} />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {accounts.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No accounts. Add them in Settings.</div>
                  ) : (
                    accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.currency_code})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={accountCurrency} readOnly className="bg-input text-center" />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
            >
              <SelectTrigger className="bg-input">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {PAYMENT_METHODS.map((pm) => (
                  <SelectItem key={pm} value={pm}>
                    {pm}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amounts */}
          {type === "income" ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gross">Gross Income</Label>
                <Input
                  id="gross"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.grossIncome}
                  onChange={(e) => setFormData({ ...formData, grossIncome: e.target.value })}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Tax Paid</Label>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.taxPaid}
                  onChange={(e) => setFormData({ ...formData, taxPaid: e.target.value })}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="net">Net Income</Label>
                <Input
                  id="net"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.netIncome}
                  onChange={(e) => setFormData({ ...formData, netIncome: e.target.value })}
                  className="bg-input"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="expense">Amount</Label>
              <Input
                id="expense"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.expense}
                onChange={(e) => setFormData({ ...formData, expense: e.target.value })}
                className="bg-input"
                required
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              {loading ? "Adding..." : "Add Transaction"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
