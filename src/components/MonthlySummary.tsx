import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const MonthlySummary = () => {
  // Mock data - will be replaced with actual data from database
  const categoryBreakdown = [
    { category: "Rent", amount: 1200, color: "bg-primary" },
    { category: "Groceries", amount: 342.5, color: "bg-accent" },
    { category: "Transport", amount: 180, color: "bg-warning" },
    { category: "Entertainment", amount: 95.8, color: "bg-success" },
    { category: "Utilities", amount: 120, color: "bg-destructive" },
  ];

  const totalExpenses = categoryBreakdown.reduce((sum, cat) => sum + cat.amount, 0);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-6">Monthly Breakdown</h2>
      
      <div className="space-y-4">
        {categoryBreakdown.map((item) => {
          const percentage = (item.amount / totalExpenses) * 100;
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
      </div>

      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center justify-between">
          <span className="font-bold">Total Expenses</span>
          <span className="text-xl font-bold text-destructive">
            €{totalExpenses.toFixed(2)}
          </span>
        </div>
      </div>
    </Card>
  );
};
