import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface RecurringTransactionFormProps {
  onSuccess: () => void;
}

export function RecurringTransactionForm({ onSuccess }: RecurringTransactionFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    description: "",
    category: "",
    account: "",
    paymentMethod: "",
    amount: "",
    type: "expense" as "expense" | "income",
    frequency: "monthly" as "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  });

  const { data: accounts } = useQuery({
    queryKey: ["user-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_accounts")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: categories } = useQuery({
    queryKey: ["user-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(formData.amount);
      const { error } = await supabase.from("recurring_transactions").insert({
        user_id: user?.id,
        description: formData.description,
        category: formData.category,
        account: formData.account,
        payment_method: formData.paymentMethod,
        expense: formData.type === "expense" ? amount : 0,
        net_income: formData.type === "income" ? amount : 0,
        frequency: formData.frequency,
        start_date: formData.startDate,
        end_date: formData.endDate || null,
        next_occurrence_date: formData.startDate,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Recurring transaction created");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create recurring transaction");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.category || !formData.account || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g., Monthly rent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value: "expense" | "income") =>
              setFormData({ ...formData, type: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount">Amount (€) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="category">Category *</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories
              ?.filter((c) => c.is_expense === (formData.type === "expense"))
              .map((cat) => (
                <SelectItem key={cat.id} value={cat.category_name}>
                  {cat.category_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="account">Account *</Label>
          <Select
            value={formData.account}
            onValueChange={(value) => setFormData({ ...formData, account: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((acc) => (
                <SelectItem key={acc.id} value={acc.account_name}>
                  {acc.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="paymentMethod">Payment Method *</Label>
          <Select
            value={formData.paymentMethod}
            onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {accounts?.map((acc) => (
                <SelectItem key={acc.id} value={acc.account_name}>
                  {acc.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="frequency">Frequency *</Label>
        <Select
          value={formData.frequency}
          onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Bi-weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="endDate">End Date (Optional)</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        Create Recurring Transaction
      </Button>
    </form>
  );
}