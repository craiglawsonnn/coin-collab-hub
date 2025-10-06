import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Wallet, LogOut } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { MonthlySummary } from "@/components/MonthlySummary";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      if (transactions) {
        const totalBalance = transactions.reduce(
          (sum, t) => sum + Number(t.net_flow || 0),
          0
        );
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyTransactions = transactions.filter((t) => {
          const date = new Date(t.date);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const income = monthlyTransactions.reduce(
          (sum, t) => sum + Number(t.net_income || 0),
          0
        );
        
        const expense = monthlyTransactions.reduce(
          (sum, t) => sum + Number(t.expense || 0),
          0
        );

        setCurrentBalance(totalBalance);
        setMonthlyIncome(income);
        setMonthlyExpenses(expense);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTransactionAdded = () => {
    setShowTransactionForm(false);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

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
            <div className="flex gap-2">
              <Button
                onClick={() => setShowTransactionForm(true)}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
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
          <MonthlySummary onUpdate={fetchDashboardData} />
        </div>

        {/* Recent Transactions */}
        <div>
          <TransactionList onUpdate={fetchDashboardData} />
        </div>
      </main>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm 
          onClose={() => setShowTransactionForm(false)} 
          onSuccess={handleTransactionAdded}
        />
      )}
    </div>
  );
};

export default Dashboard;
