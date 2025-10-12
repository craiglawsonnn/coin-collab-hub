import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pause, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RecurringTransactionForm } from "./RecurringTransactionForm";
import { Badge } from "@/components/ui/badge";

export function RecurringTransactions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: recurring, isLoading } = useQuery({
    queryKey: ["recurring-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("user_id", user?.id)
        .order("next_occurrence_date");
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (data: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ is_active: !data.isActive })
        .eq("id", data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Status updated successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Recurring transaction deleted");
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Recurring Transaction
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Recurring Transaction</DialogTitle>
          </DialogHeader>
          <RecurringTransactionForm onSuccess={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {recurring?.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 bg-muted rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{item.description || item.category}</span>
                <Badge variant={item.is_active ? "default" : "secondary"}>
                  {item.is_active ? "Active" : "Paused"}
                </Badge>
                <Badge variant="outline">{item.frequency}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {item.expense > 0 ? `€${item.expense} expense` : `€${item.net_income} income`}
                {" • "}
                Next: {new Date(item.next_occurrence_date).toLocaleDateString()}
                {item.end_date && ` • Ends: ${new Date(item.end_date).toLocaleDateString()}`}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  toggleActiveMutation.mutate({ id: item.id, isActive: item.is_active })
                }
              >
                {item.is_active ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(item.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {recurring?.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No recurring transactions yet. Add your first one above.
          </p>
        )}
      </div>
    </div>
  );
}