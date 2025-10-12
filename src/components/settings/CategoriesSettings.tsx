import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function CategoriesSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState("");
  const [categoryType, setCategoryType] = useState<"expense" | "income">("expense");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["user-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_categories")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("category_name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { categoryName: string; isExpense: boolean }) => {
      const { error } = await supabase
        .from("user_categories")
        .insert({
          user_id: user?.id,
          category_name: data.categoryName,
          is_expense: data.isExpense,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      setNewCategory("");
      toast.success("Category added successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_categories")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete category");
    },
  });

  const handleAdd = () => {
    if (!newCategory.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    createMutation.mutate({
      categoryName: newCategory.trim(),
      isExpense: categoryType === "expense",
    });
  };

  const expenseCategories = categories?.filter((c) => c.is_expense) || [];
  const incomeCategories = categories?.filter((c) => !c.is_expense) || [];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <RadioGroup
          value={categoryType}
          onValueChange={(value) => setCategoryType(value as "expense" | "income")}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="expense" id="expense" />
            <Label htmlFor="expense">Expense</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="income" id="income" />
            <Label htmlFor="income">Income</Label>
          </div>
        </RadioGroup>

        <div className="flex gap-2">
          <Input
            placeholder="New category name (e.g., Groceries)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={createMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">Expense Categories</h3>
          <div className="space-y-2">
            {expenseCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <span>{category.category_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(category.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            {expenseCategories.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No expense categories yet
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Income Categories</h3>
          <div className="space-y-2">
            {incomeCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <span>{category.category_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(category.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            {incomeCategories.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No income categories yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}