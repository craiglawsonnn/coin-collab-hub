import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TransactionList = () => {
  // Mock data - will be replaced with actual data from database
  const transactions = [
    {
      id: "1",
      date: "2025-10-04",
      category: "Groceries",
      description: "Tesco weekly shop",
      account: "Revolut",
      amount: -85.43,
      type: "expense",
    },
    {
      id: "2",
      date: "2025-10-03",
      category: "Salary",
      description: "Monthly salary",
      account: "BoI",
      amount: 3500.0,
      type: "income",
    },
    {
      id: "3",
      date: "2025-10-02",
      category: "Transport",
      description: "Fuel",
      account: "Revolut",
      amount: -60.0,
      type: "expense",
    },
    {
      id: "4",
      date: "2025-10-01",
      category: "Rent",
      description: "October rent",
      account: "BoI",
      amount: -1200.0,
      type: "expense",
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Recent Transactions</h2>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-2 rounded-full ${
                  transaction.type === "income"
                    ? "bg-success/10"
                    : "bg-destructive/10"
                }`}
              >
                {transaction.type === "income" ? (
                  <ArrowUpRight className="h-5 w-5 text-success" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="font-medium">{transaction.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {transaction.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {transaction.account}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div
              className={`text-lg font-bold ${
                transaction.type === "income" ? "text-success" : "text-destructive"
              }`}
            >
              {transaction.amount > 0 ? "+" : ""}€
              {Math.abs(transaction.amount).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
