import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { MonthlySummary } from "@/components/MonthlySummary";

const Dashboard = () => {
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  // Mock data - will be replaced with actual data from database
  const currentBalance = 2456.32;
  const monthlyIncome = 3500.0;
  const monthlyExpenses = 1543.68;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Budget Tracker</h1>
              <p className="text-sm text-muted-foreground">Track your finances together</p>
            </div>
            <Button
              onClick={() => setShowTransactionForm(true)}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Balance Overview */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="p-6 bg-gradient-to-br from-card to-card/80 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">€{currentBalance.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">All accounts combined</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 shadow-lg hover:shadow-xl transition-shadow border-success/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-success">Monthly Income</p>
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <p className="text-3xl font-bold text-success">€{monthlyIncome.toFixed(2)}</p>
            <p className="text-xs text-success/70 mt-2">This month</p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-destructive/10 to-destructive/5 shadow-lg hover:shadow-xl transition-shadow border-destructive/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-destructive">Monthly Expenses</p>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-3xl font-bold text-destructive">€{monthlyExpenses.toFixed(2)}</p>
            <p className="text-xs text-destructive/70 mt-2">This month</p>
          </Card>
        </div>

        {/* Monthly Summary */}
        <div className="mb-8">
          <MonthlySummary />
        </div>

        {/* Recent Transactions */}
        <div>
          <TransactionList />
        </div>
      </main>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm onClose={() => setShowTransactionForm(false)} />
      )}
    </div>
  );
};

export default Dashboard;
