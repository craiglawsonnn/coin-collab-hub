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

interface Transaction {
  id: string;
  date: string;
  category: string;
  description: string | null;
  account: string;
  net_income: number;
  expense: number;
  user_id?: string | null;
  created_at?: string | null;
  created_by_name?: string | null;
}

interface TransactionListProps {
  onUpdate?: () => void;
  refreshToken?: number;
}

export const TransactionList = ({ onUpdate, refreshToken }: TransactionListProps) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const { toast } = useToast();

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

  // initialize from URL and load
  useEffect(() => {
  const type = searchParams.get("type");
    const categories = searchParams.get("categories");
    const accounts = searchParams.get("accounts");
  const users = searchParams.get("users");

    if (type === "income" || type === "expense") setFilterType(type as any);
    if (categories) setFilterCategories(categories.split(",").filter(Boolean));
    if (accounts) setFilterAccounts(accounts.split(",").filter(Boolean));
  if (users) setFilterUsers(users.split(",").filter(Boolean));

    fetchAllOptions();
    // do initial fetch with applied URL filters
    fetchTransactions({
      type: type ?? undefined,
      categories: categories ? categories.split(",").filter(Boolean) : undefined,
      accounts: accounts ? accounts.split(",").filter(Boolean) : undefined,
      users: users ? users.split(",").filter(Boolean) : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch when refreshToken changes (e.g., new transaction was added elsewhere)
  useEffect(() => {
    fetchAllOptions();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const fetchAllOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("transactions").select("category,account").limit(1000);
      if (error) throw error;
      const cats = Array.from(new Set((data || []).map((r: any) => r.category).filter(Boolean)));
      const accs = Array.from(new Set((data || []).map((r: any) => r.account).filter(Boolean)));
      setAvailableCategories(cats as string[]);
      setAvailableAccounts(accs as string[]);
      // derive available users from the transactions we fetched (will obey RLS)
      const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id,full_name,email").in("id", userIds as string[]).limit(1000);
        const usersList = (profiles || []).map((p: any) => ({ id: p.id, name: p.full_name || p.email || p.id }));
        setAvailableUsers(usersList);
      } else {
        setAvailableUsers([]);
      }
    } catch (e) {
      // don't crash the UI on options fetch
    }
  }, []);

  const fetchTransactions = useCallback(
    async (opts?: { type?: string; categories?: string[]; accounts?: string[]; users?: string[] }) => {
      setIsFiltering(true);
      setLoading(true);
      try {
        let query: any = supabase.from("transactions").select("*").order("date", { ascending: false }).limit(50);

  const type = opts?.type ?? filterType;
  const categories = opts?.categories ?? filterCategories;
  const accounts = opts?.accounts ?? filterAccounts;
  const users = opts?.users ?? filterUsers;

        if (categories && categories.length > 0) {
          query = query.in("category", categories);
        }

        if (accounts && accounts.length > 0) {
          query = query.in("account", accounts);
        }

        if (users && users.length > 0) {
          query = query.in("user_id", users);
        }

        if (type === "income") {
          query = query.gt("net_income", 0);
        } else if (type === "expense") {
          query = query.gt("expense", 0);
        }

        const { data, error } = await query;

        if (error) throw error;
        const raw = data || [];

        // fetch profile names for the transactions' user_ids
        const userIds = Array.from(new Set(raw.map((r: any) => r.user_id).filter(Boolean)));
        let profilesMap: Record<string, { full_name?: string | null; email?: string | null }> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id,full_name,email").in("id", userIds as string[]).limit(1000);
          for (const p of profiles || []) profilesMap[p.id] = p;
        }

        const withNames = raw.map((r: any) => ({
          ...r,
          created_by_name: profilesMap[r.user_id]?.full_name || profilesMap[r.user_id]?.email || null,
        }));

        setTransactions(withNames as Transaction[]);
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
      // refetch with current filters
      fetchTransactions();
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
    // clear URL
    setSearchParams({});
    fetchTransactions({ type: "all", categories: [], accounts: [] });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-6">Recent Transactions</h2>
        <p className="text-muted-foreground">Loading...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Recent Transactions</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>View all</Button>
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
                  if (v === "all") delete params.type; else params.type = v;
                  setSearchParams(params);
                  fetchTransactions({ type: v as any, categories: filterCategories, accounts: filterAccounts });
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
                      const next = filterCategories.includes(c) ? filterCategories.filter((x) => x !== c) : [...filterCategories, c];
                      setFilterCategories(next);
                      const params: any = Object.fromEntries(searchParams.entries());
                      if (next.length) params.categories = next.join(","); else delete params.categories;
                      setSearchParams(params);
                      fetchTransactions({ type: filterType, categories: next, accounts: filterAccounts });
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
                      const next = filterAccounts.includes(a) ? filterAccounts.filter((x) => x !== a) : [...filterAccounts, a];
                      setFilterAccounts(next);
                      const params: any = Object.fromEntries(searchParams.entries());
                      if (next.length) params.accounts = next.join(","); else delete params.accounts;
                      setSearchParams(params);
                      fetchTransactions({ type: filterType, categories: filterCategories, accounts: next });
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
                      const next = filterUsers.includes(u.id) ? filterUsers.filter((x) => x !== u.id) : [...filterUsers, u.id];
                      setFilterUsers(next);
                      const params: any = Object.fromEntries(searchParams.entries());
                      if (next.length) params.users = next.join(","); else delete params.users;
                      setSearchParams(params);
                      fetchTransactions({ type: filterType, categories: filterCategories, accounts: filterAccounts, users: next });
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
        <p className="text-muted-foreground text-center py-8">No transactions yet. Add your first transaction to get started!</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const isIncome = Number(transaction.net_income) > 0;
            const amount = isIncome ? Number(transaction.net_income) : Number(transaction.expense);

            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      isIncome
                        ? "bg-success/10"
                        : "bg-destructive/10"
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="h-5 w-5 text-success" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description || "No description"}</p>
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
                      {transaction.created_by_name && (
                        <span className="text-xs text-muted-foreground">Added by {String(transaction.created_by_name).split(" ")[0]}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`text-lg font-bold ${
                      isIncome ? "text-success" : "text-destructive"
                    }`}
                  >
                    {isIncome ? "+" : "-"}€
                    {amount.toFixed(2)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(transaction.id)}
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
