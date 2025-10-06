import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CategorySummary {
  category: string;
  amount: number;
}

interface MonthlySummaryProps {
  onUpdate?: () => void;
}

export const MonthlySummary = ({ onUpdate }: MonthlySummaryProps) => {
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySummary[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMonthlySummary();
  }, []);

  const fetchMonthlySummary = async () => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("category, expense")
        .gte("date", `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .lt("date", `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`);

      if (error) throw error;

      if (transactions) {
        const categoryMap = new Map<string, number>();
        
        transactions.forEach((t) => {
          const expense = Number(t.expense) || 0;
          if (expense > 0) {
            categoryMap.set(
              t.category,
              (categoryMap.get(t.category) || 0) + expense
            );
          }
        });

        const categorySummaries = Array.from(categoryMap.entries())
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount);

        setCategoryBreakdown(categorySummaries);
        setTotalExpenses(categorySummaries.reduce((sum, cat) => sum + cat.amount, 0));
      }
    } catch (error: any) {
      toast({
        title: "Error fetching summary",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Monthly Breakdown</h2>
        <p className="text-muted-foreground">Loading...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">Monthly Breakdown</h2>
      
      {categoryBreakdown.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No expenses this month</p>
      ) : (
        <div className="space-y-4">
          {categoryBreakdown.map((item) => {
            const percentage = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0;
            return (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.category}</span>
                  <span className="text-muted-foreground">
                    €{item.amount.toFixed(2)} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
              </div>
            );
          })}

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <span className="font-bold">Total Expenses</span>
              <span className="text-xl font-bold text-destructive">
                €{totalExpenses.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
