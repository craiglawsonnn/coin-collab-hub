// src/pages/Transactions.tsx
import { useEffect, useMemo, useState } from "react";
import LeftNav from "@/components/LeftNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  ChevronLeft,
  Check,
  Filter,
} from "lucide-react";

type Tx = {
  id: string;
  user_id: string;
  date: string;                     // ISO date/time
  description: string | null;
  category: string | null;
  account: string | null;
  net_income?: number | null;
  expense?: number | null;
  net_flow: number;

  // Optional audit fields (safe if not present in DB; UI hides them)
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  // const viewingOwnerId = searchParams.get("owner") || user?.id || "";
  // const isOwn = user?.id === viewingOwnerId;
  const ownerParam = searchParams.get("owner");
  const isUuid = (v?: string | null) =>
    !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

  const viewingOwnerId = isUuid(ownerParam) ? ownerParam! : (user?.id ?? null);
  const isOwn = !!user && viewingOwnerId === user.id;
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  const [sort, setSort] = useState<"date" | "amount">("date");
  const [direction, setDirection] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(0);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");

  const [editing, setEditing] = useState<Tx | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // map user_id -> display name for audit lines
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, direction, page, viewingOwnerId]);

  const fmtAmount = (n: number, currency = "EUR") =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);

  const fmtDateTime = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  async function fetchPage() {
    setLoading(true);
    try {
      const limit = 50;

      let query = supabase
        .from("transactions")
        .select(
          // only columns that exist in your current schema
          "id,user_id,date,description,category,account,net_income,expense,net_flow,created_at,updated_at"
        )
        .eq("user_id", viewingOwnerId);


      if (sort === "date") query = query.order("date", { ascending: direction === "asc" });
      else query = query.order("net_flow", { ascending: direction === "asc" });

      const from = page * limit;
      const to = from + limit - 1;
      const { data, error } = await query.range(from, to);
      if (error) throw error;

      const txs = (data || []) as Tx[];
      setTransactions(txs);

      // Resolve names for created_by / updated_by
      const ids = Array.from(
        new Set(txs.flatMap(t => [t.created_by, t.updated_by]).filter(Boolean) as string[])
      );
      if (ids.length) {
        const { data: profs, error: pErr } = await supabase
          .from("searchable_profiles")
          .select("id, full_name, email")
          .in("id", ids);
        if (!pErr && profs) {
          const map: Record<string, string> = {};
          profs.forEach(p => (map[p.id] = p.full_name || p.email || p.id));
          setNameMap(map);
        }
      } else {
        setNameMap({});
      }
    } catch (e: any) {
      toast({
        title: "Error loading transactions",
        description: e.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesQ =
        !q ||
        `${t.description ?? ""} ${t.category ?? ""} ${t.account ?? ""}`.toLowerCase().includes(q);

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "income" && (t.net_flow ?? 0) > 0) ||
        (typeFilter === "expense" && (t.net_flow ?? 0) < 0);

      return matchesQ && matchesType;
    });
  }, [transactions, query, typeFilter]);

  function openEdit(t: Tx) {
    if (!isOwn) return;
    setEditing(t);
  }

  // Save WITHOUT sending net_flow (DB computes it)
  async function saveEdit(values: Partial<Tx> & { id: string }) {
    const optimisticNetFlow =
      typeof values.net_flow === "number"
        ? values.net_flow
        : (values.net_income ?? 0) - (values.expense ?? 0);

    // optimistic
    setTransactions((prev) =>
      prev.map((t) => (t.id === values.id ? { ...t, ...values, net_flow: optimisticNetFlow } as Tx : t))
    );

    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          description: values.description ?? null,
          category: values.category ?? null,
          account: values.account ?? null,
          date: values.date ?? null,
          net_income: values.net_income ?? null,
          expense: values.expense ?? null,
          updated_by: user?.id ?? null,       // optional audit (safe if column missing)
        })
        .eq("id", values.id)
        .eq("user_id", viewingOwnerId);
      if (error) throw error;

      toast({ title: "Saved", description: "Transaction updated." });
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e.message || String(e),
        variant: "destructive",
      });
      fetchPage(); // revert
    } finally {
      setEditing(null);
    }
  }

  async function confirmDelete(id: string) {
    setConfirmDeleteId(null);
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", viewingOwnerId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Transaction removed." });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message || String(e), variant: "destructive" });
      setTransactions(snapshot);
    }
  }

  return (
    <LeftNav>
      <div className="w-full px-4 py-6 md:px-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="px-2 sm:px-3"
              onClick={() => navigate(viewingOwnerId !== user?.id ? `/?owner=${viewingOwnerId}` : "/")}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              <span className="hidden xs:inline">Back</span>
            </Button>
            <h2 className="text-xl sm:text-2xl font-bold">All Transactions</h2>
            {!isOwn && (
              <span className="text-[10px] sm:text-xs rounded bg-muted/60 px-2 py-1 text-muted-foreground">
                Read-only view
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Input
                placeholder="Search description/category/account..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-[160px] sm:w-[220px]"
              />
            </div>

            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="w-[120px] sm:w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={sort === "date" ? "default" : "outline"}
              size="sm"
              className="px-2 sm:px-3"
              onClick={() => {
                setSort("date");
                setDirection((d) => (d === "asc" ? "desc" : "asc"));
              }}
            >
              Sort by date
            </Button>

            <Button
              variant={sort === "amount" ? "default" : "outline"}
              size="sm"
              className="px-2 sm:px-3"
              onClick={() => {
                setSort("amount");
                setDirection((d) => (d === "asc" ? "desc" : "asc"));
              }}
            >
              Sort by amount
            </Button>
          </div>
        </div>

        {/* List */}
        <Card className="p-3 sm:p-4">
          {loading ? (
            <p>Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">No transactions found.</p>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {filtered.map((t) => {
                const positive = (t.net_flow ?? 0) > 0;
                return (
                  <div
                    key={t.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 border rounded hover:bg-accent/40 transition-colors"
                    onClick={() => openEdit(t)}
                    role={isOwn ? "button" : undefined}
                  >
                    {/* Left: icon + main info */}
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`mt-0.5 p-2 rounded-full ${
                          positive ? "bg-emerald-500/15" : "bg-rose-500/15"
                        }`}
                      >
                        {positive ? (
                          <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-rose-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        {/* Title */}
                        <div className="font-medium truncate">
                          {t.description || <span className="text-muted-foreground">No description</span>}
                        </div>

                        {/* Badges */}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {t.category || "Uncategorized"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {t.account || "—"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {fmtDateTime(t.date)}
                          </span>
                        </div>

                        {/* Meta line */}
                        {(t.created_by || t.updated_by || t.created_at || t.updated_at) && (
                          <div className="mt-1 text-[11px] sm:text-xs text-muted-foreground">
                            {t.created_by && (
                              <>
                                created by{" "}
                                <span className="font-medium">
                                  {nameMap[t.created_by] || t.created_by}
                                </span>
                                {t.created_at ? ` • ${fmtDateTime(t.created_at)}` : null}
                              </>
                            )}
                            {t.updated_by && (
                              <>
                                {t.created_by ? " — " : ""}
                                updated by{" "}
                                <span className="font-medium">
                                  {nameMap[t.updated_by] || t.updated_by}
                                </span>
                                {t.updated_at ? ` • ${fmtDateTime(t.updated_at)}` : null}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: amount + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`font-bold ${
                          positive ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {fmtAmount(Number(t.net_flow) || 0, "EUR")}
                      </div>

                      {isOwn && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(t);
                            }}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(t.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <Button size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            Previous
          </Button>
          <div className="text-sm">Page {page + 1}</div>
          <Button size="sm" onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>

        {/* Edit dialog */}
        {editing && (
          <EditTransactionDialog tx={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
        )}

        {/* Delete confirm */}
        <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete transaction?</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => confirmDelete(confirmDeleteId!)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LeftNav>
  );
}

/** Simple edit form inside a dialog */
function EditTransactionDialog({
  tx,
  onClose,
  onSave,
}: {
  tx: Tx;
  onClose: () => void;
  onSave: (values: Partial<Tx> & { id: string }) => void;
}) {
  const [values, setValues] = useState<Partial<Tx>>({
    id: tx.id,
    description: tx.description ?? "",
    category: tx.category ?? "",
    account: tx.account ?? "",
    date: tx.date?.slice(0, 10),
    net_income: tx.net_income ?? undefined,
    expense: tx.expense ?? undefined,
    net_flow: tx.net_flow,
  });

  function computeNetFlow(v: typeof values) {
    const ni = Number(v.net_income ?? 0);
    const ex = Number(v.expense ?? 0);
    return Number.isFinite(ni - ex) ? ni - ex : v.net_flow ?? 0;
    }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>Update details and save your changes.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={values.date ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="account">Account</Label>
            <Input
              id="account"
              value={values.account ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, account: e.target.value }))}
              placeholder="e.g. Revolut"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={values.description ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="e.g. Grocery run"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={values.category ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
              placeholder="e.g. Groceries"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="income">Income (€)</Label>
            <Input
              id="income"
              type="number"
              step="0.01"
              value={values.net_income ?? ""}
              onChange={(e) =>
                setValues((v) => {
                  const ni = e.target.value === "" ? undefined : Number(e.target.value);
                  return { ...v, net_income: ni, net_flow: computeNetFlow({ ...v, net_income: ni }) };
                })
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="expense">Expense (€)</Label>
            <Input
              id="expense"
              type="number"
              step="0.01"
              value={values.expense ?? ""}
              onChange={(e) =>
                setValues((v) => {
                  const ex = e.target.value === "" ? undefined : Number(e.target.value);
                  return { ...v, expense: ex, net_flow: computeNetFlow({ ...v, expense: ex }) };
                })
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="netflow">Net flow (€)</Label>
            <Input
              id="netflow"
              type="number"
              step="0.01"
              value={values.net_flow ?? 0}
              onChange={(e) => {
                const nf = Number(e.target.value);
                setValues((v) => ({ ...v, net_flow: nf }));
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                id: tx.id,
                ...values,
              })
            }
          >
            <Check className="mr-2 h-4 w-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
