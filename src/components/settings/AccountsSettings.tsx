import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AccountRow = {
  id: string;
  user_id: string;
  account_name: string;
  is_active: boolean;
  currency_code: string; // char(3)
};

const CURRENCIES = [
  "EUR","USD","GBP","PLN","CHF","JPY","AUD","CAD","SEK","NOK","DKK",
  "CZK","HUF","RON","BGN","TRY","ZAR","MXN","BRL","INR","KRW","CNY"
] as const;

export function AccountsSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [newAccount, setNewAccount] = useState("");
  const [newCurrency, setNewCurrency] = useState<string>("EUR");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["user-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_accounts")
        .select("id, user_id, account_name, is_active, currency_code")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("account_name");

      if (error) throw error;
      return (data ?? []) as AccountRow[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; currency_code: string }) => {
      const { error } = await supabase.from("user_accounts").insert({
        user_id: user?.id,
        account_name: payload.name,
        currency_code: payload.currency_code, // <-- set on create
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-accounts"] });
      setNewAccount("");
      setNewCurrency("EUR");
      toast.success("Account added successfully");
    },
    onError: (error: any) => toast.error(error.message || "Failed to add account"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_accounts")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-accounts"] });
      toast.success("Account deleted successfully");
    },
    onError: (error: any) => toast.error(error.message || "Failed to delete account"),
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: async ({ id, currency_code }: { id: string; currency_code: string }) => {
      const { error } = await supabase
        .from("user_accounts")
        .update({ currency_code })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, currency_code }) => {
      await queryClient.cancelQueries({ queryKey: ["user-accounts"] });
      const prev = queryClient.getQueryData<AccountRow[]>(["user-accounts"]);
      // optimistic update
      queryClient.setQueryData<AccountRow[]>(["user-accounts"], (old) =>
        (old ?? []).map((a) => (a.id === id ? { ...a, currency_code } : a))
      );
      return { prev };
    },
    onError: (error: any, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["user-accounts"], ctx.prev);
      toast.error(error.message || "Failed to update currency");
    },
    onSuccess: () => toast.success("Currency updated"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["user-accounts"] }),
  });

  const handleAdd = () => {
    const name = newAccount.trim();
    if (!name) {
      toast.error("Please enter an account name");
      return;
    }
    createMutation.mutate({ name, currency_code: newCurrency });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Create new account */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="New account name (e.g., Bank of Ireland)"
          value={newAccount}
          onChange={(e) => setNewAccount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="sm:flex-1"
        />
        <Select value={newCurrency} onValueChange={setNewCurrency}>
          <SelectTrigger className="w-full sm:w-[120px]">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((ccy) => (
              <SelectItem key={ccy} value={ccy}>
                {ccy}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={createMutation.isPending} className="whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      {/* Existing accounts */}
      <div className="space-y-2">
        {accounts?.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 bg-muted rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{account.account_name}</span>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={account.currency_code || "EUR"}
                onValueChange={(v) =>
                  updateCurrencyMutation.mutate({ id: account.id, currency_code: v })
                }
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((ccy) => (
                    <SelectItem key={ccy} value={ccy}>
                      {ccy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(account.id)}
                disabled={deleteMutation.isPending}
                aria-label={`Delete ${account.account_name}`}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {accounts?.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No accounts yet. Add your first account above.
          </p>
        )}
      </div>
    </div>
  );
}
