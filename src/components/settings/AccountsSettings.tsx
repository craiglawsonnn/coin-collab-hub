import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AccountsSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newAccount, setNewAccount] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["user-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_accounts")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("account_name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (accountName: string) => {
      const { error } = await supabase
        .from("user_accounts")
        .insert({
          user_id: user?.id,
          account_name: accountName,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-accounts"] });
      setNewAccount("");
      toast.success("Account added successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add account");
    },
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
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  const handleAdd = () => {
    if (!newAccount.trim()) {
      toast.error("Please enter an account name");
      return;
    }
    createMutation.mutate(newAccount.trim());
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="New account name (e.g., Bank of Ireland)"
          value={newAccount}
          onChange={(e) => setNewAccount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={createMutation.isPending}>
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {accounts?.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-3 bg-muted rounded-lg"
          >
            <span>{account.account_name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate(account.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
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