import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, LogOut, Settings } from "lucide-react";

import InviteToDashboard from "@/components/InviteToDashboard";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import AccountBalances from "@/components/AccountBalances";
import CreateViewForm from "@/components/CreateViewForm";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { MonthlySummary } from "@/components/MonthlySummary";
import AdjustmentList from "@/components/AdjustmentList";
import ThemeToggle from "@/components/ThemeToggle";
import BalanceAdjustment from "@/components/BalanceAdjustment";
import LeftNav from "@/components/LeftNav";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/* Background veil + mobile flag */
import DarkVeil from "@/components/DarkVeil";
import { useIsMobile } from "@/hooks/use-mobile";

type Period = "day" | "week" | "month" | "year";

const Dashboard = () => {
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);

  // INDEPENDENT totals
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);

  // INDEPENDENT periods
  const [incomePeriod, setIncomePeriod] = useState<Period>("month");
  const [expensePeriod, setExpensePeriod] = useState<Period>("month");

  const [refreshToken, setRefreshToken] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customViews, setCustomViews] = useState<any[]>([]);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // card visibility preferences
  const [showBalanceCard, setShowBalanceCard] = useState(true);
  const [showIncomeCard, setShowIncomeCard] = useState(true);
  const [showExpensesCard, setShowExpensesCard] = useState(true);
  const [showMonthlySummaryCard, setShowMonthlySummaryCard] = useState(true);
  const [showAdjustmentsCard, setShowAdjustmentsCard] = useState(true);

  const isMobile = useIsMobile();

  // track theme
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );

  // ✅ debug log when theme flips
  useEffect(() => {
    if (typeof document !== "undefined") {
      console.log(
        "[DBG] isDark:",
        isDark,
        "| html.class:",
        document.documentElement.className
      );
    }
  }, [isDark]);

  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() =>
      setIsDark(root.classList.contains("dark"))
    );
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // load user prefs
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("preferences")
          .eq("id", user?.id)
          .single();
        if (error) throw error;
        const prefs = (profile?.preferences as any) || {};
        if (prefs.cards) {
          setShowBalanceCard(Boolean(prefs.cards.showBalanceCard ?? true));
          setShowIncomeCard(Boolean(prefs.cards.showIncomeCard ?? true));
          setShowExpensesCard(Boolean(prefs.cards.showExpensesCard ?? true));
          setShowMonthlySummaryCard(Boolean(prefs.cards.showMonthlySummaryCard ?? true));
          setShowAdjustmentsCard(Boolean(prefs.cards.showAdjustmentsCard ?? true));
        }
        if (prefs.customViews && Array.isArray(prefs.customViews)) {
          setCustomViews(prefs.customViews);
        }
      } catch {
        // ignore
      }
    };
    if (user) loadPrefs();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, incomePeriod, expensePeriod]);

  const inPeriod = (dateStr: string, p: Period) => {
    const now = new Date();
    const d = new Date(dateStr);

    if (p === "day") {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    if (p === "week") {
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays < 7;
    }
    if (p === "month") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (p === "year") {
      return d.getFullYear() === now.getFullYear();
    }
    return false;
  };

  const fetchDashboardData = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;

      const tx = (data as any[]) || [];
      setTransactions(tx);

      // Balance = total net_flow overall
      const totalBalance = tx.reduce((sum, t) => sum + Number(t.net_flow || 0), 0);
      setCurrentBalance(totalBalance);

      // Income uses incomePeriod
      const incomeTx = tx.filter((t) => inPeriod(t.date, incomePeriod));
      const income = incomeTx.reduce((s, t) => s + Number(t.net_income || 0), 0);
      setIncomeTotal(income);

      // Expenses use expensePeriod
      const expenseTx = tx.filter((t) => inPeriod(t.date, expensePeriod));
      const expense = expenseTx.reduce((s, t) => s + Number(t.expense || 0), 0);
      setExpenseTotal(expense);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const titleFor = (p: Period) =>
    p === "day"
      ? "This day"
      : p === "week"
      ? "This week"
      : p === "month"
      ? "This month"
      : "This year";

  // --- local apply for a single inserted transaction row (if provided)
  const applyLocalTx = (tx: any) => {
    setTransactions((prev) => [tx, ...prev]);
    setCurrentBalance((prev) => prev + Number(tx.net_flow || 0));

    if (inPeriod(tx.date, incomePeriod)) {
      setIncomeTotal((prev) => prev + Number(tx.net_income || 0));
    }
    if (inPeriod(tx.date, expensePeriod)) {
      setExpenseTotal((prev) => prev + Number(tx.expense || 0));
    }
  };

  // --- after balance adjustment
  const handleBalanceAdjusted = (tx?: any) => {
    if (tx) {
      applyLocalTx(tx);
    } else {
      fetchDashboardData();
    }
    setRefreshToken((r) => r + 1);
  };

  // --- after adding a transaction
  const handleTransactionAddedWithRefresh = (tx?: any) => {
    setShowTransactionForm(false);
    setRefreshToken((r) => r + 1);
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
    <LeftNav>
      {/* page shell */}
      <div className="relative min-h-screen bg-background overflow-hidden">
        {/* Background (behind everything on the page) */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 isolate">
            {/* Wrap the canvas so we can filter it in light mode without touching UI */}
            <div
              className={[
                "absolute inset-0 will-change-[filter,opacity] transition-[filter,opacity] duration-300",
                !isDark ? "opacity-95" : "opacity-100",
              ].join(" ")}
              style={
                !isDark
                  ? { filter: "invert(1) hue-rotate(240deg) saturate(1.8) brightness(0.75)" }
                  : undefined
              }
            >
              <DarkVeil
                className="h-full w-full"
                hueShift={1}
                noiseIntensity={0.03}
                scanlineIntensity={0.06}
                scanlineFrequency={2.8}
                speed={isMobile ? 0.35 : 0.5}
                warpAmount={0.08}
                resolutionScale={isMobile ? 0.75 : 1}
                opacity={0.26} 
              />
            </div>

            {/* Optional pastel lift in light mode (doesn't affect UI) */}
            {!isDark && (
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  mixBlendMode: "screen",
                  opacity: 0.45,
                  background:
                    "radial-gradient(120% 90% at 15% 0%, rgba(20,184,166,.20) 0%, transparent 60%)," +
                    "radial-gradient(110% 80% at 85% 20%, rgba(147,51,234,.16) 0%, transparent 65%)",
                }}
              />
            )}
          </div>
        </div>


        {/* Header — fluid width (no container) */}
        <header className="relative z-10 border-b bg-card/80 backdrop-blur">
          <div className="w-full px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Budget Tracker</h1>
                <p className="text-sm text-muted-foreground">Track your finances together</p>
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Customize dashboard</DialogTitle>
                      <DialogDescription>
                        Choose which cards are visible on your dashboard. These settings are saved to your profile.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 py-4">
                      <label className="flex items-center gap-2">
                        <Checkbox checked={showBalanceCard} onCheckedChange={(v) => setShowBalanceCard(Boolean(v))} />
                        <span>Current Balance</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox checked={showIncomeCard} onCheckedChange={(v) => setShowIncomeCard(Boolean(v))} />
                        <span>Income</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox checked={showExpensesCard} onCheckedChange={(v) => setShowExpensesCard(Boolean(v))} />
                        <span>Expenses</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={showMonthlySummaryCard}
                          onCheckedChange={(v) => setShowMonthlySummaryCard(Boolean(v))}
                        />
                        <span>Monthly Summary</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Checkbox checked={showAdjustmentsCard} onCheckedChange={(v) => setShowAdjustmentsCard(Boolean(v))} />
                        <span>Adjustments</span>
                      </label>
                    </div>
                    <InviteToDashboard dashboardId={user?.id} />

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            const prefs = {
                              cards: {
                                showBalanceCard,
                                showIncomeCard,
                                showExpensesCard,
                                showMonthlySummaryCard,
                                showAdjustmentsCard,
                              },
                            };
                            const { error } = await supabase
                              .from("profiles")
                              .update({ preferences: prefs })
                              .eq("id", user?.id);
                            if (error) throw error;
                            toast({ title: "Preferences saved" });
                          } catch (err: any) {
                            toast({
                              title: "Error saving preferences",
                              description: err.message || String(err),
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <ThemeToggle />

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="mr-2" variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Add view
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create custom view</DialogTitle>
                      <DialogDescription>Create a wallet or insight view (pie or bar chart).</DialogDescription>
                    </DialogHeader>

                    <CreateViewForm
                      transactions={transactions}
                      onCreate={async (view) => {
                        try {
                          const next = [...customViews, view];
                          setCustomViews(next);
                          const prefs = { customViews: next };
                          const { error } = await supabase
                            .from("profiles")
                            .update({ preferences: prefs })
                            .eq("id", user?.id);
                          if (error) throw error;
                          toast({ title: "View saved" });
                        } catch (err: any) {
                          toast({
                            title: "Error saving view",
                            description: err.message || String(err),
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  </DialogContent>
                </Dialog>

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

        {/* Main — fluid width (no container) */}
        <main className="relative z-10 w-full px-4 py-8">
          {/* Balance Overview */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {showBalanceCard && (
              <Card className="p-6 bg-gradient-to-br from-card to-card/80 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                  <AccountBalances />
                </div>

                <p className="text-3xl font-bold text-foreground">€{currentBalance.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-2">All accounts combined</p>

                <div className="mt-3">
                  <BalanceAdjustment
                    currentBalance={currentBalance}
                    onSuccess={handleBalanceAdjusted}
                  />
                </div>
              </Card>
            )}

            {showIncomeCard && (
              <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 shadow-lg hover:shadow-xl transition-shadow border-success/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-success">{titleFor(incomePeriod)} Income</p>
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <p className="text-3xl font-bold text-success">€{incomeTotal.toFixed(2)}</p>
                <p className="text-xs text-success/70 mt-2">{titleFor(incomePeriod)}</p>
                {/* Income period selector */}
                <div className="mt-3 w-full max-w-[9.5rem] self-start">
                  <Select value={incomePeriod} onValueChange={(v) => setIncomePeriod(v as any)}>
                    <SelectTrigger
                      className="
                        h-8 px-3 text-[13px] rounded-lg
                        border
                        bg-success/15 hover:bg-success/20 data-[state=open]:bg-success/25
                        text-success border-success/30
                        dark:bg-success/20 dark:hover:bg-success/25 dark:data-[state=open]:bg-success/30
                        dark:border-success/40
                      "
                    >
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border">
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            )}

            {showExpensesCard && (
              <Card className="p-6 bg-gradient-to-br from-destructive/10 to-destructive/5 shadow-lg hover:shadow-xl transition-shadow border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-destructive">{titleFor(expensePeriod)} Expenses</p>
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-3xl font-bold text-destructive">€{expenseTotal.toFixed(2)}</p>
                <p className="text-xs text-destructive/70 mt-2">{titleFor(expensePeriod)}</p>
                {/* Expense period selector */}
                <div className="mt-3 w-full max-w-[9.5rem] self-start">
                  <Select value={expensePeriod} onValueChange={(v) => setExpensePeriod(v as any)}>
                    <SelectTrigger
                      className="
                        h-8 px-3 text-[13px] rounded-lg
                        border
                        bg-destructive/15 hover:bg-destructive/20 data-[state=open]:bg-destructive/25
                        text-destructive border-destructive/30
                        dark:bg-destructive/20 dark:hover:bg-destructive/25 dark:data-[state=open]:bg-destructive/30
                        dark:border-destructive/40
                      "
                    >
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border">
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </Card>
            )}
          </div>

          {/* Monthly Summary */}
          <div className="mb-8">
            <MonthlySummary onUpdate={fetchDashboardData} />
          </div>

          {/* Adjustments */}
          <div className="mb-8">
            <AdjustmentList onUndo={fetchDashboardData} />
          </div>

          {/* Recent Transactions */}
          <div>
            <TransactionList onUpdate={fetchDashboardData} refreshToken={refreshToken} />
          </div>
        </main>

        {/* Transaction Form Modal */}
        {showTransactionForm && (
          <TransactionForm
            onClose={() => setShowTransactionForm(false)}
            onSuccess={handleTransactionAddedWithRefresh}
          />
        )}
      </div>

      {/* DEBUG: shows which branch you're in + current <html> classes */}
      <div
        style={{
          position: "fixed",
          right: 8,
          bottom: 8,
          zIndex: 99999,
          fontSize: 12,
          padding: "6px 8px",
          borderRadius: 6,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          pointerEvents: "none",
        }}
      >
        isDark: {String(isDark)}
        <br />
        html.class: {typeof document !== "undefined" ? document.documentElement.className : "(ssr)"}
      </div>
    </LeftNav>
  );
};

export default Dashboard;
