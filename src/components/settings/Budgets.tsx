import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";

type Budget = {
  id: string;
  category: string | null;
  amount: number;
  currency_code: string;
  period: "weekly" | "monthly" | "yearly";
  is_active: boolean;
};

export function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<"EUR" | "USD" | "GBP" | "PLN">("EUR");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");

  useEffect(() => {
    if (user?.id) {
      loadBudgets();
      loadCategories();
    }
  }, [user?.id]);

  async function loadBudgets() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBudgets((data as Budget[]) || []);
    } catch (err) {
      console.error("Error loading budgets:", err);
      toast.error("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from("user_categories")
        .select("category_name")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .eq("is_expense", true);

      if (error) throw error;
      setCategories(data?.map((c) => c.category_name) || []);
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  }

  function resetForm() {
    setCategory("");
    setAmount("");
    setCurrency("EUR");
    setPeriod("monthly");
  }

  async function handleCreate() {
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const { error } = await supabase.from("budgets").insert({
        user_id: user!.id,
        category: category || null,
        amount: value,
        currency_code: currency,
        period,
        is_active: true,
      });

      if (error) throw error;

      toast.success(category ? `Budget for ${category} created` : "Overall budget created");
      setDialogOpen(false);
      resetForm();
      loadBudgets();
    } catch (err: any) {
      console.error("Error creating budget:", err);
      if (err?.message?.toLowerCase?.().includes("unique")) {
        toast.error("Budget already exists for this category/period");
      } else {
        toast.error("Failed to create budget");
      }
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from("budgets")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Budget deleted");
      loadBudgets();
    } catch (err) {
      console.error("Error deleting budget:", err);
      toast.error("Failed to delete budget");
    }
  }

  const overallBudget = budgets.find((b) => !b.category);
  const categoryBudgets = budgets.filter((b) => b.category);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Set spending limits to track your expenses
        </p>

        {/* Dialog: force on top with high z so it won’t hide behind headers/sidebars */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md z-[100]">
            <DialogHeader>
              <DialogTitle>Create Budget</DialogTitle>
              <DialogDescription>
                Create an overall budget (all categories) or a category-specific one.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="budget-category">Category (optional)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="budget-category">
                    <SelectValue placeholder="Overall budget (all categories)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Overall budget</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget-amount">Amount</Label>
                <Input
                  id="budget-amount"
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="budget-currency">Currency</Label>
                  <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                    <SelectTrigger id="budget-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="PLN">PLN (zł)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget-period">Period</Label>
                  <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
                    <SelectTrigger id="budget-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleCreate} className="w-full">
                Create Budget
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <DollarSign className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p>No budgets set yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {overallBudget && (
            <div className="p-4 border rounded-lg bg-primary/5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">Overall Budget</h3>
                  <p className="text-2xl font-bold mt-1">
                    {overallBudget.amount.toFixed(2)} {overallBudget.currency_code}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {overallBudget.period}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(overallBudget.id)}
                  aria-label="Delete overall budget"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {categoryBudgets.length > 0 && (
            <>
              <h3 className="font-medium text-sm text-muted-foreground mt-6">
                Category Budgets
              </h3>
              <div className="grid gap-3">
                {categoryBudgets.map((budget) => (
                  <div key={budget.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{budget.category}</h4>
                        <p className="text-lg font-semibold mt-1">
                          {budget.amount.toFixed(2)} {budget.currency_code}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {budget.period}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(budget.id)}
                        aria-label={`Delete budget ${budget.category}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
