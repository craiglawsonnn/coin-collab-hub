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
import {
  Eye,
  EyeOff,
  Plus,
  TrendingUp,
  TrendingDown,
  LogOut,
  LayoutGrid,
  MoreVertical,
  Settings as SettingsIcon,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { useFxRates } from "@/hooks/useFxRates";
import InviteToDashboard from "@/components/InviteToDashboard";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/** Currency settings */
import { useDisplayCurrency } from "@/hooks/useDisplayCurrency";
import DisplayCurrencyDialog from "@/components/settings/DisplayCurrencyDialog";

/* Background veil + mobile flag */
import DarkVeil from "@/components/DarkVeil";
import { useIsMobile } from "@/hooks/use-mobile";

type Period = "day" | "week" | "month" | "year";

/** Which balance to show on the main card */
type BalanceView =
  | { mode: "ALL" }
  | { mode: "ACCOUNT"; id: string; name: string; currency: string };

const Dashboard = () => {
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);

  // Totals (in active display currency)
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);

  // Periods
  const [incomePeriod, setIncomePeriod] = useState<Period>("month");
  const [expensePeriod, setExpensePeriod] = useState<Period>("month");

  const [refreshToken, setRefreshToken] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customViews, setCustomViews] = useState<any[]>([]);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Determine which dashboard we're viewing (own or shared)
  const viewingOwnerId = searchParams.get("owner") || user?.id;

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

  /** Currency settings */
  const { displayCurrency, saveDisplayCurrency } = useDisplayCurrency();
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);

  /** Which balance the main card shows (persist to localStorage) */
  const [balanceView, setBalanceView] = useState<BalanceView>(() => {
    try {
      return JSON.parse(localStorage.getItem("balance:main") || '{"mode":"ALL"}');
    } catch {
      return { mode: "ALL" };
    }
  });
  useEffect(() => {
    localStorage.setItem("balance:main", JSON.stringify(balanceView));
  }, [balanceView]);

  /** The currency we’ll use everywhere when rendering money */
  const activeCurrency =
    displayCurrency ||
    (balanceView.mode === "ACCOUNT" ? balanceView.currency : "EUR");

  // FX
  const { data: fxData } = useFxRates();

  // Generic converter (falls back if your hook doesn’t export one)
  const convert = (amount: number, from: string, to: string) => {
    if (!fxData || from === to) return Number(amount || 0);

    const { rates, base } = fxData;
    const rFrom = rates[from] ?? (from === base ? 1 : undefined);
    const rTo   = rates[to]   ?? (to   === base ? 1 : undefined);
    if (rFrom == null || rTo == null) return Number(amount || 0);

    const inBase = Number(amount || 0) / rFrom;
    return inBase * rTo;
  };

  // Detect a tx’s currency (adjust keys if yours differ)
  const txCurrency = (t: any) =>
    t.currency_code || t.currency || t.account_currency || "EUR";

  // Convenience
  const toActive = (amt: number, fromCur: string) =>
    convert(amt, fromCur, activeCurrency);

  // Show/hide the DarkVeil background - default to false for performance
  const [veilEnabled, setVeilEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("ui:veilEnabled");
    if (saved != null) return saved === "1";
    return false; // Default to static background for better performance
  });
  useEffect(() => {
    localStorage.setItem("ui:veilEnabled", veilEnabled ? "1" : "0");
  }, [veilEnabled]);

  // ------- NEW: monthly overall budget state -------
  const [monthlyBudget, setMonthlyBudget] = useState<{
    amount: number;
    currency: string;
  } | null>(null);

  const saveCardPrefs = async (next: {
    showBalanceCard: boolean;
    showIncomeCard: boolean;
    showExpensesCard: boolean;
    showMonthlySummaryCard?: boolean;
    showAdjustmentsCard?: boolean;
  }) => {
    try {
      const prefs = {
        cards: {
          showBalanceCard: next.showBalanceCard,
          showIncomeCard: next.showIncomeCard,
          showExpensesCard: next.showExpensesCard,
          showMonthlySummaryCard,
          showAdjustmentsCard,
        },
        ...(customViews?.length ? { customViews } : {}),
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
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // debug log when theme flips
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
          setShowMonthlySummaryCard(
            Boolean(prefs.cards.showMonthlySummaryCard ?? true)
          );
          setShowAdjustmentsCard(
            Boolean(prefs.cards.showAdjustmentsCard ?? true)
          );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, incomePeriod, expensePeriod, viewingOwnerId]);

  // ------- NEW: fetch latest active overall monthly budget for viewed owner -------
  useEffect(() => {
    if (!viewingOwnerId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("budgets")
          .select("amount, currency_code")
          .eq("user_id", viewingOwnerId)
          .eq("is_active", true)
          .eq("period", "monthly")
          .is("category", null)
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) throw error;
        if (data && data.length) {
          setMonthlyBudget({
            amount: Number(data[0].amount || 0),
            currency: data[0].currency_code || "EUR",
          });
        } else {
          setMonthlyBudget(null);
        }
      } catch (e: any) {
        console.warn("Failed to load monthly budget:", e?.message || e);
        setMonthlyBudget(null);
      }
    })();
  }, [viewingOwnerId, refreshToken]);

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

  /** Fetch + set transactions only. All totals are recomputed in a separate effect. */
  const fetchDashboardData = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", viewingOwnerId)
        .order("date", { ascending: false });
      if (error) throw error;

      setTransactions((data as any[]) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  /** Recompute totals whenever tx/period/currency/rates change */
  useEffect(() => {
    if (!transactions.length) {
      setIncomeTotal(0);
      setExpenseTotal(0);
      setCurrentBalance(0);
      return;
    }

    // Income — sum in activeCurrency for the selected period
    const income = transactions
      .filter((t) => inPeriod(t.date, incomePeriod))
      .reduce((s, t) => s + toActive(Number(t.net_income || 0), txCurrency(t)), 0);

    // Expenses — sum in activeCurrency for the selected period
    const expense = transactions
      .filter((t) => inPeriod(t.date, expensePeriod))
      .reduce((s, t) => s + toActive(Number(t.expense || 0), txCurrency(t)), 0);

    // Overall balance — sum all net_flow in activeCurrency
    const total = transactions
      .reduce((s, t) => s + toActive(Number(t.net_flow || 0), txCurrency(t)), 0);

    setIncomeTotal(income);
    setExpenseTotal(expense);
    setCurrentBalance(total);
  }, [transactions, incomePeriod, expensePeriod, activeCurrency, fxData]);

  const titleFor = (p: Period) =>
    p === "day" ? "This day" : p === "week" ? "This week" : p === "month" ? "This month" : "This year";

  // Local insert: we just push the tx; the recompute effect will update totals
  const applyLocalTx = (tx: any) => {
    setTransactions((prev) => [tx, ...prev]);
  };

  // after balance adjustment
  const handleBalanceAdjusted = (tx?: any) => {
    if (tx) {
      applyLocalTx(tx);
    } else {
      fetchDashboardData();
    }
    setRefreshToken((r) => r + 1);
  };

  // after adding a transaction
  const handleTransactionAddedWithRefresh = (tx?: any) => {
    setShowTransactionForm(false);
    setRefreshToken((r) => r + 1);
    if (tx) applyLocalTx(tx);
    else fetchDashboardData();
  };

  // ---- EARLY RETURNS MUST COME AFTER ALL HOOKS ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (!user) return null;

  const anyHidden = !showBalanceCard || !showIncomeCard || !showExpensesCard;

  /** Compute what the main card should show (converted if a single account is selected) */
  const displayBalance =
    balanceView.mode === "ALL"
      ? currentBalance
      : transactions
          .filter((t) => t.account === balanceView.name)
          .reduce((s, t) => s + toActive(Number(t.net_flow || 0), txCurrency(t)), 0);

  /** Money formatter */
  const fmtMoney = (amount: number, currency = "EUR") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      amount
    );

  return (
    <LeftNav>
      {/* page shell */}
      <div className="relative min-h-screen bg-background overflow-hidden">
        {/* Background - static image by default, animated veil when enabled */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 isolate">
            {veilEnabled ? (
              <>
                <div
                  className={[
                    "absolute inset-0 will-change-[filter,opacity] transition-[filter,opacity] duration-300",
                    !isDark ? "opacity-95" : "opacity-100",
                  ].join(" ")}
                  style={
                    !isDark
                      ? {
                          filter:
                            "invert(1) hue-rotate(240deg) saturate(1.8) brightness(0.75)",
                        }
                      : undefined
                  }
                >
                  <DarkVeil
                    cover="viewport"
                    className="h-full w-full"
                    hueShift={1}
                    noiseIntensity={0.03}
                    scanlineIntensity={0.06}
                    scanlineFrequency={2.8}
                    speed={isMobile ? 0.35 : 0.5}
                    warpAmount={0.08}
                    opacity={0.26}
                    enabled={true}
                    resolutionScale={isMobile ? 0.5 : 0.75}
                    maxDevicePixelRatio={1}
                    targetFps={30}
                    pauseWhenHidden={true}
                  />
                </div>
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
              </>
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-300"
                style={{
                  backgroundImage: isDark
                    ? `url(${require("@/assets/background.png")})`
                    : `url(${require("@/assets/backgroundLight.png")})`,
                  opacity: 0.6,
                }}
              />
            )}
          </div>
        </div>

        {/* Header — fluid width (no container) */}
        <header className="relative z-10 border-b bg-card/80 backdrop-blur">
          <div className="w-full px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="md:hidden -ml-1" />
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-foreground truncate">
                    Budget Tracker
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Track your finances together
                  </p>
                </div>
              </div>

              <div className="ml-auto hidden md:flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Show/Hide cards">
                      {anyHidden ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Show cards</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={showBalanceCard}
                      onCheckedChange={(val) => {
                        setShowBalanceCard(!!val);
                        saveCardPrefs({
                          showBalanceCard: !!val,
                          showIncomeCard,
                          showExpensesCard,
                          showMonthlySummaryCard,
                          showAdjustmentsCard,
                        });
                      }}
                    >
                      Current Balance
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={showIncomeCard}
                      onCheckedChange={(val) => {
                        setShowIncomeCard(!!val);
                        saveCardPrefs({
                          showBalanceCard,
                          showIncomeCard: !!val,
                          showExpensesCard,
                          showMonthlySummaryCard,
                          showAdjustmentsCard,
                        });
                      }}
                    >
                      This month Income
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={showExpensesCard}
                      onCheckedChange={(val) => {
                        setShowExpensesCard(!!val);
                        saveCardPrefs({
                          showBalanceCard,
                          showIncomeCard,
                          showExpensesCard: !!val,
                          showMonthlySummaryCard,
                          showAdjustmentsCard,
                        });
                      }}
                    >
                      This month Expenses
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <ThemeToggle />

                {/* Currency settings */}
                <Button
                  variant="ghost"
                  size="icon"
                  title="Display currency options"
                  onClick={() => setCurrencyDialogOpen(true)}
                >
                  <SettingsIcon className="h-5 w-5" />
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="mr-2" variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Add view
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create custom view</DialogTitle>
                      <DialogDescription>
                        Create a wallet or insight view (pie or bar chart).
                      </DialogDescription>
                    </DialogHeader>

                    <CreateViewForm
                      transactions={transactions}
                      onCreate={async (view) => {
                        try {
                          const next = [...customViews, view];
                          setCustomViews(next);
                          const prefs = {
                            customViews: next,
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

              {/* Right: mobile toolbar */}
              <div className="ml-auto flex items-center gap-1 md:hidden">
                <Button
                  size="icon"
                  className="h-9 w-9 bg-primary text-primary-foreground"
                  onClick={() => setShowTransactionForm(true)}
                  aria-label="Add transaction"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <ThemeToggle />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="More">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => setShowTransactionForm(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add transaction
                    </DropdownMenuItem>

                    <Dialog>
                      <DialogTrigger asChild>
                        <DropdownMenuItem className="gap-2">
                          <LayoutGrid className="h-4 w-4" />
                          Add view
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Create custom view</DialogTitle>
                          <DialogDescription>
                            Create a wallet or insight view (pie or bar chart).
                          </DialogDescription>
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

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="gap-2">
                      <LogOut className="h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  <p className="text-sm font-medium text-muted-foreground">
                    {balanceView.mode === "ALL" ? "Current Balance" : balanceView.name}
                  </p>
                  <AccountBalances />
                </div>

                <p className="text-3xl font-bold text-foreground">
                  {fmtMoney(displayBalance, activeCurrency)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {balanceView.mode === "ALL"
                    ? "All accounts combined"
                    : `Only ${balanceView.name}`}
                </p>

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
                  <p className="text-sm font-medium text-success">
                    {titleFor(incomePeriod)} Income
                  </p>
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <p className="text-3xl font-bold text-success">
                  {fmtMoney(incomeTotal, activeCurrency)}
                </p>
                <p className="text-xs text-success/70 mt-2">{titleFor(incomePeriod)}</p>
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
                  <p className="text-sm font-medium text-destructive">
                    {titleFor(expensePeriod)} Expenses
                  </p>
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-3xl font-bold text-destructive">
                  {fmtMoney(expenseTotal, activeCurrency)}
                </p>
                <p className="text-xs text-destructive/70 mt-2">{titleFor(expensePeriod)}</p>

                {/* ------- NEW: Budget progress (only for monthly overall budget) ------- */}
                {expensePeriod === "month" && monthlyBudget && (
                  <div className="mt-3">
                    {(() => {
                      const spent = Number(expenseTotal || 0);
                      const budget = monthlyBudget.amount;
                      const pct = budget > 0 ? (spent / budget) * 100 : 0;
                      const clamped = Math.min(100, Math.max(0, pct));
                      const over = budget > 0 && spent > budget;

                      return (
                        <>
                          <div className="flex items-center justify-between text-xs text-destructive/80">
                            <span>Budget</span>
                            <span className="tabular-nums">
                              {fmtMoney(spent, monthlyBudget.currency)} /{" "}
                              {fmtMoney(budget, monthlyBudget.currency)} ({Math.round(pct)}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-destructive/20 overflow-hidden">
                            <div
                              className={`h-full ${over ? "bg-destructive" : "bg-destructive/70"}`}
                              style={{ width: `${clamped}%` }}
                            />
                          </div>
                          {over && (
                            <p className="mt-1 text-[12px] text-destructive">
                              You’re over budget by{" "}
                              <span className="font-medium">
                                {fmtMoney(spent - budget, monthlyBudget.currency)}
                              </span>
                              .
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

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

      {/* Currency dialog lives at the root so it overlays everything */}
      <DisplayCurrencyDialog
        open={currencyDialogOpen}
        onOpenChange={setCurrencyDialogOpen}
        initial={displayCurrency ?? "EUR"}
        onSave={saveDisplayCurrency}
      />
    </LeftNav>
  );
};

export default Dashboard;
