import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Filter, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type CurrencyCode = string | null;

interface Transaction {
  id: string;
  user_id: string | null;
  date: string;                 // ISO
  category: string | null;
  description: string | null;
  account: string | null;
  payment_method?: string | null;

  // money columns in your table
  gross_income?: number | null;
  net_income: number | null;
  expense: number | null;

  // optional currency columns (shown in screenshots)
  currency_code?: CurrencyCode;
  base_currency?: CurrencyCode;

  created_at?: string | null;
  updated_at?: string | null;

  // derived for display (not from DB)
  created_by_name?: string | null;
}

interface TransactionListProps {
  onUpdate?: () => void;
  refreshToken?: number;
}

export const TransactionList = ({ onUpdate, refreshToken }: TransactionListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);

  // URL search params
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters (multi-select for categories/accounts)
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterAccounts, setFilterAccounts] = useState<string[]>([]);
  const [filterUsers, setFilterUsers] = useState<string[]>([]);

  // options for filters
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string }[]>([]);

  // ---- load URL filters + first fetch
useEffect(() => {
  // Parse and validate URL params
  const typeRaw = searchParams.get("type");
  const typeParam: "all" | "income" | "expense" | undefined =
    typeRaw === "income" || typeRaw === "expense" || typeRaw === "all"
      ? typeRaw
      : undefined;

  const categoriesParam = (searchParams.get("categories") || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const accountsParam = (searchParams.get("accounts") || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const usersParam = (searchParams.get("users") || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  if (typeParam) setFilterType(typeParam);
  if (categoriesParam.length) setFilterCategories(categoriesParam);
  if (accountsParam.length) setFilterAccounts(accountsParam);
  if (usersParam.length) setFilterUsers(usersParam);

  fetchAllOptions();

  // initial fetch with URL filters applied
  fetchTransactions({
    type: typeParam,
    categories: categoriesParam.length ? categoriesParam : undefined,
    accounts: accountsParam.length ? accountsParam : undefined,
    users: usersParam.length ? usersParam : undefined,
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  // refresh externally (e.g. after add/delete)
  useEffect(() => {
    fetchAllOptions();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const fetchAllOptions = useCallback(async () => {
    try {
      // only select the fields we need to build filter options
      const { data, error } = await supabase
        .from("transactions")
        .select("category,account,user_id")
        .limit(1000);

      if (error) throw error;

      const cats = Array.from(new Set((data || []).map((r: any) => r.category).filter(Boolean)));
      const accs = Array.from(new Set((data || []).map((r: any) => r.account).filter(Boolean)));
      setAvailableCategories(cats as string[]);
      setAvailableAccounts(accs as string[]);

      // map users
      const userIds = Array.from(
        new Set((data || []).map((r: any) => r.user_id).filter(Boolean))
      );
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,full_name,email")
          .in("id", userIds as string[])
          .limit(1000);

        const usersList =
          (profiles || []).map((p: any) => ({
            id: p.id,
            name: p.full_name || p.email || p.id,
          })) ?? [];
        setAvailableUsers(usersList);
      } else {
        setAvailableUsers([]);
      }
    } catch {
      // don't block UI if this fails
    }
  }, []);

  const fetchTransactions = useCallback(
    async (opts?: {
      type?: "all" | "income" | "expense";
      categories?: string[];
      accounts?: string[];
      users?: string[];
    }) => {
      setIsFiltering(true);
      setLoading(true);
      try {
        // select exactly from your schema (+ currency_code)
        let query: any = supabase
          .from("transactions")
          .select(
            `
            id,
            user_id,
            date,
            category,
            description,
            account,
            payment_method,
            gross_income,
            net_income,
            expense,
            currency_code,
            base_currency,
            created_at,
            updated_at
          `
          )
          .order("date", { ascending: false })
          .limit(50);

        const type = opts?.type ?? filterType;
        const categories = opts?.categories ?? filterCategories;
        const accounts = opts?.accounts ?? filterAccounts;
        const users = opts?.users ?? filterUsers;

        if (categories && categories.length > 0) query = query.in("category", categories);
        if (accounts && accounts.length > 0) query = query.in("account", accounts);
        if (users && users.length > 0) query = query.in("user_id", users);

        if (type === "income") {
          query = query.gt("net_income", 0);
        } else if (type === "expense") {
          query = query.gt("expense", 0);
        }

        const { data, error } = await query;
        if (error) throw error;

        const raw = (data || []) as Transaction[];

        // decorate with user names
        const userIds = Array.from(new Set(raw.map((r) => r.user_id).filter(Boolean)));
        let profilesMap: Record<string, { full_name?: string | null; email?: string | null }> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id,full_name,email")
            .in("id", userIds as string[])
            .limit(1000);
          for (const p of profiles || []) profilesMap[p.id] = p;
        }

        const withNames = raw.map((r) => ({
          ...r,
          created_by_name: profilesMap[r.user_id as string]?.full_name
            || profilesMap[r.user_id as string]?.email
            || null,
        }));

        setTransactions(withNames);
      } catch (error: any) {
        toast({
          title: "Error fetching transactions",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setIsFiltering(false);
      }
    },
    [filterType, filterCategories, filterAccounts, filterUsers, toast]
  );

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Transaction deleted" });
      fetchTransactions(); // refetch with current filters
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error deleting transaction",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setFilterType("all");
    setFilterCategories([]);
    setFilterAccounts([]);
    setFilterUsers([]);
    setSearchParams({});
    fetchTransactions({ type: "all", categories: [], accounts: [] });
  };

  const fmtMoney = (value: number, currency?: CurrencyCode) => {
    const ccy = (currency || "EUR") as string;
    return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(value);
  };

  if (loading) {
    return (
      <Card className="p-4 sm:p-5 md:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Recent Transactions</h2>
        <p className="text-muted-foreground text-sm">Loading...</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold">Recent Transactions</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")}>
            View all
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isFiltering}>
                {isFiltering ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Filter className="mr-2 h-4 w-4" />
                )}
                Filter
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 max-h-72 overflow-auto">
              <DropdownMenuLabel>Type</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filterType}
                onValueChange={(v) => {
                  setFilterType(v as any);
                  const params: any = Object.fromEntries(searchParams.entries());
                  if (v === "all") delete params.type;
                  else params.type = v;
                  setSearchParams(params);
                  fetchTransactions({
                    type: v as any,
                    categories: filterCategories,
                    accounts: filterAccounts,
                    users: filterUsers,
                  });
                }}
              >
                <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="income">Income</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="expense">Expense</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Category</DropdownMenuLabel>
              {availableCategories.length === 0 ? (
                <DropdownMenuItem>—</DropdownMenuItem>
              ) : (
                availableCategories.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c}
                    checked={filterCategories.includes(c)}
                    onCheckedChange={() => {
                      const next = filterCategories.includes(c)
                        ? filterCategories.filter((x) => x !== c)
                        : [...filterCategories, c];
                      setFilterCategories(next);
                      const params: any = Object.fromEntries(searchParams.entries());
                      if (next.length) params.categories = next.join(",");
                      else delete params.categories;
                      setSearchParams(params);
                      fetchTransactions({
                        type: filterType,
                        categories: next,
                        accounts: filterAccounts,
                        users: filterUsers,
                      });
                    }}
                  >
                    {filterCategories.includes(c) ? "✓ " : ""}
                    {c}
                  </DropdownMenuCheckboxItem>
                ))
              )}

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Account</DropdownMenuLabel>
              {availableAccounts.length === 0 ? (
                <DropdownMenuItem>—</DropdownMenuItem>
              ) : (
                availableAccounts.map((a) => (
                  <DropdownMenuCheckboxItem
                    key={a}
                    checked={filterAccounts.includes(a)}
                    onCheckedChange={() => {
                      const next = filterAccounts.includes(a)
                        ? filterAccounts.filter((x) => x !== a)
                        : [...filterAccounts, a];
                      setFilterAccounts(next);
                      const params: any = Object.fromEntries(searchParams.entries());
                      if (next.length) params.accounts = next.join(",");
                      else delete params.accounts;
                      setSearchParams(params);
                      fetchTransactions({
                        type: filterType,
                        categories: filterCategories,
                        accounts: next,
                        users: filterUsers,
                      });
                    }}
                  >
                    {filterAccounts.includes(a) ? "✓ " : ""}
                    {a}
                  </DropdownMenuCheckboxItem>
                ))
              )}

              <DropdownMenuSeparator />

              <DropdownMenuLabel>Users</DropdownMenuLabel>
              {availableUsers.length === 0 ? (
                <DropdownMenuItem>—</DropdownMenuItem>
              ) : (
                availableUsers.map((u) => (
                  <DropdownMenuCheckboxItem
                    key={u.id}
                    checked={filterUsers.includes(u.id)}
                    onCheckedChange={() => {
                      const next = filterUsers.includes(u.id)
                        ? filterUsers.filter((x) => x !== u.id)
                        : [...filterUsers, u.id];
                      setFilterUsers(next);
                      const params: any = Object.fromEntries(searchParams.entries());
                      if (next.length) params.users = next.join(",");
                      else delete params.users;
                      setSearchParams(params);
                      fetchTransactions({
                        type: filterType,
                        categories: filterCategories,
                        accounts: filterAccounts,
                        users: next,
                      });
                    }}
                  >
                    {filterUsers.includes(u.id) ? "✓ " : ""}
                    {u.name}
                  </DropdownMenuCheckboxItem>
                ))
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearFilters}>Clear filters</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8 text-sm sm:text-base">
          No transactions yet. Add your first transaction to get started!
        </p>
      ) : (
        <div className="space-y-3">
          {transactions.map((t) => {
            const isIncome = Number(t.net_income || 0) > 0;
            const amount = isIncome ? Number(t.net_income || 0) : Number(t.expense || 0);
            const currency = (t.currency_code || t.base_currency || "EUR") as string;

            return (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border bg-card/60 hover:bg-card transition-colors p-3 sm:p-4 md:p-5"
              >
                {/* LEFT */}
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                  <div
                    className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center ${
                      isIncome ? "bg-emerald-900/30" : "bg-rose-900/30"
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 sm:h-6 sm:w-6 text-rose-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold leading-tight text-base sm:text-lg md:text-xl truncate">
                      {t.description || "No description"}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {t.category && (
                        <Badge
                          variant="secondary"
                          className="px-2 py-0.5 text-[10px] sm:text-[11px] md:text-xs"
                        >
                          {t.category}
                        </Badge>
                      )}

                      {t.account && (
                        <span className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground">
                          {t.account}
                        </span>
                      )}

                      <span className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()}
                      </span>

                      {t.created_by_name && (
                        <span className="text-[10px] sm:text-[11px] md:text-xs text-muted-foreground truncate">
                          Added by {String(t.created_by_name).split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 shrink-0">
                  <div
                    className={`font-semibold whitespace-nowrap leading-none text-lg sm:text-xl md:text-2xl ${
                      isIncome ? "text-emerald-500" : "text-rose-400"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {fmtMoney(amount, currency)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete transaction"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default TransactionList;
