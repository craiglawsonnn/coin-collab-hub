import { useEffect, useMemo, useState } from "react";
import LeftNav from "@/components/LeftNav";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Pencil } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Palette as PaletteIcon, Save, SaveAll, X } from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ----------------------------- Types & helpers ---------------------------- */

type Tx = {
  id: string;
  date: string; // ISO
  category?: string | null;
  payment_method?: string | null;
  net_income?: number | null;
  expense?: number | null;
};

type ChartType = "bar" | "line" | "pie";
type Metric = "income" | "expense" | "both";
type GroupBy = "month" | "category" | "payment_method";

type SeriesColors = {
  income?: string;              // for bar/line
  expense?: string;             // for bar/line
  palette?: string[];           // for pie
};

type ChartConfig = {
  id: string;
  title: string;
  type: ChartType;
  metric: Metric;
  groupBy: GroupBy;
  colors?: SeriesColors;
};

type GraphView = {
  id: string;
  name: string;
  charts: ChartConfig[];
};

const DEFAULT_COLORS = {
  income: "#22c55e",
  expense: "#ef4444",
  palette: ["#4f46e5", "#22c55e", "#ef4444", "#f59e0b", "#06b6d4", "#a855f7", "#84cc16", "#e11d48"],
};
const uid = () => Math.random().toString(36).slice(2, 10);
const fmtMonth = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" }).format(d);

/* ----------------------------- Data transformers -------------------------- */

function buildDataset(transactions: Tx[], cfg: ChartConfig) {
  const safe = (n: number | null | undefined) => Number(n || 0);

  if (cfg.groupBy === "month") {
    const by = new Map<string, { label: string; income: number; expense: number }>();
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!by.has(key)) by.set(key, { label: fmtMonth(d), income: 0, expense: 0 });
      const item = by.get(key)!;
      item.income += safe(t.net_income);
      item.expense += safe(t.expense);
    }
    return Array.from(by.values());
  }

  if (cfg.groupBy === "category") {
    const by = new Map<string, { label: string; income: number; expense: number }>();
    for (const t of transactions) {
      const key = t.category || "(blank)";
      if (!by.has(key)) by.set(key, { label: key, income: 0, expense: 0 });
      const item = by.get(key)!;
      item.income += safe(t.net_income);
      item.expense += safe(t.expense);
    }
    return Array.from(by.values());
  }

  const by = new Map<string, { label: string; income: number; expense: number }>();
  for (const t of transactions) {
    const key = t.payment_method || "(blank)";
    if (!by.has(key)) by.set(key, { label: key, income: 0, expense: 0 });
    const item = by.get(key)!;
    item.income += safe(t.net_income);
    item.expense += safe(t.expense);
  }
  return Array.from(by.values());
}

/* --------------------------------- UI bits -------------------------------- */

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1">
      <label className="text-sm">{label}</label>
      <div className="flex items-center gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
        <input
          aria-label={`${label} color`}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 rounded-md border"
        />
      </div>
    </div>
  );
}

function ChartRenderer({
  cfg,
  data,
  onRemove,
  onEditColors,
}: {
  cfg: ChartConfig;
  data: any[];
  onRemove: () => void;
  onEditColors: () => void;
}) {
  const showBoth = cfg.metric === "both";
  const ic = cfg.colors?.income || DEFAULT_COLORS.income;
  const ec = cfg.colors?.expense || DEFAULT_COLORS.expense;
  const palette = cfg.colors?.palette || DEFAULT_COLORS.palette;

  return (
    <Card className="p-4 bg-card/80 backdrop-blur shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{cfg.title}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onEditColors} title="Edit colors">
            <PaletteIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove} title="Remove">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {cfg.type === "bar" && (
            <BarChart data={data}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              {(cfg.metric === "income" || showBoth) && (
                <Bar dataKey="income" name="Net Income" fill={ic} />
              )}
              {(cfg.metric === "expense" || showBoth) && (
                <Bar dataKey="expense" name="Expense" fill={ec} />
              )}
            </BarChart>
          )}

          {cfg.type === "line" && (
            <LineChart data={data}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              {(cfg.metric === "income" || showBoth) && (
                <Line type="monotone" dataKey="income" name="Net Income" stroke={ic} dot={false} />
              )}
              {(cfg.metric === "expense" || showBoth) && (
                <Line type="monotone" dataKey="expense" name="Expense" stroke={ec} dot={false} />
              )}
            </LineChart>
          )}

          {cfg.type === "pie" && (
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={data.map((d) => ({
                  name: d.label,
                  value: cfg.metric === "income" ? d.income : d.expense,
                }))}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ---------- Builder & color editor dialogs (with color pickers) ----------- */

function ChartBuilder({
  open,
  setOpen,
  onCreate,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onCreate: (cfg: ChartConfig) => void;
}) {
  const [title, setTitle] = useState("New chart");
  const [type, setType] = useState<ChartType>("bar");
  const [metric, setMetric] = useState<Metric>("both");
  const [groupBy, setGroupBy] = useState<GroupBy>("month");
  const [incomeColor, setIncomeColor] = useState(DEFAULT_COLORS.income);
  const [expenseColor, setExpenseColor] = useState(DEFAULT_COLORS.expense);
  const [palette, setPalette] = useState<string[]>(DEFAULT_COLORS.palette.slice(0, 6));

  useEffect(() => {
    if (type === "pie" && metric === "both") setMetric("expense");
  }, [type, metric]);

  const setQuickPalette = (p: string[]) => setPalette(p.slice(0, 8));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a graph</DialogTitle>
          <DialogDescription>Pick the chart type, data, and colors.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label className="text-sm">Chart type</label>
              <Select value={type} onValueChange={(v) => setType(v as ChartType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm">Metric</label>
              <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {type !== "pie" && <SelectItem value="both">Both</SelectItem>}
                  <SelectItem value="income">Net Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm">Group by</label>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="payment_method">Payment method</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type !== "pie" ? (
            <div className="grid grid-cols-2 gap-3">
              <ColorInput label="Income color" value={incomeColor} onChange={setIncomeColor} />
              <ColorInput label="Expense color" value={expenseColor} onChange={setExpenseColor} />
            </div>
          ) : (
            <div className="grid gap-2">
              <label className="text-sm">Palette (pie)</label>
              <div className="grid grid-cols-3 gap-2">
                {palette.map((c, i) => (
                  <input
                    key={i}
                    type="color"
                    value={c}
                    onChange={(e) => {
                      const next = palette.slice();
                      next[i] = e.target.value;
                      setPalette(next);
                    }}
                    className="h-9 w-full rounded-md border"
                  />
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPalette(["#f59e0b", "#eab308", "#fde047", "#84cc16", "#22c55e", "#14b8a6"])}
                >
                  Warm
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPalette(["#0ea5e9", "#22d3ee", "#8b5cf6", "#a78bfa", "#f472b6", "#fb7185"])}
                >
                  Cool
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickPalette(DEFAULT_COLORS.palette)}
                >
                  Default
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              const colors: SeriesColors =
                type === "pie"
                  ? { palette }
                  : { income: incomeColor, expense: expenseColor };
              onCreate({ id: uid(), title, type, metric, groupBy, colors });
              setOpen(false);
            }}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChartColorsEditor({
  open,
  setOpen,
  cfg,
  onApply,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  cfg: ChartConfig;
  onApply: (colors: SeriesColors) => void;
}) {
  const [incomeColor, setIncomeColor] = useState(cfg.colors?.income || DEFAULT_COLORS.income);
  const [expenseColor, setExpenseColor] = useState(cfg.colors?.expense || DEFAULT_COLORS.expense);
  const [palette, setPalette] = useState<string[]>(
    cfg.colors?.palette || DEFAULT_COLORS.palette.slice(0, 6)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit colors – {cfg.title}</DialogTitle>
        </DialogHeader>

        {cfg.type !== "pie" ? (
          <div className="grid grid-cols-2 gap-3 py-2">
            <ColorInput label="Income color" value={incomeColor} onChange={setIncomeColor} />
            <ColorInput label="Expense color" value={expenseColor} onChange={setExpenseColor} />
          </div>
        ) : (
          <div className="grid gap-2 py-2">
            <label className="text-sm">Palette (pie)</label>
            <div className="grid grid-cols-3 gap-2">
              {palette.map((c, i) => (
                <input
                  key={i}
                  type="color"
                  value={c}
                  onChange={(e) => {
                    const next = palette.slice();
                    next[i] = e.target.value;
                    setPalette(next);
                  }}
                  className="h-9 w-full rounded-md border"
                />
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button
            onClick={() => {
              const colors: SeriesColors =
                cfg.type === "pie" ? { palette } : { income: incomeColor, expense: expenseColor };
              onApply(colors);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- Page ----------------------------------- */

export default function Graphs() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);

  // views
  const [views, setViews] = useState<GraphView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const activeView = views.find((v) => v.id === activeViewId) || null;

  // color editor
  const [editTarget, setEditTarget] = useState<ChartConfig | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id,date,category,payment_method,net_income,expense")
        .order("date", { ascending: true });
      if (!error && data) setTransactions(data as Tx[]);
    })();
  }, []);

  // load user views
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("graph_views")
        .select("id,name,charts")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (!error && data) setViews(data as GraphView[]);
    })();
  }, [user]);

  const datasets = useMemo(
    () => charts.map((cfg) => ({ cfg, data: buildDataset(transactions, cfg) })),
    [charts, transactions]
  );

  function loadExample() {
    setActiveViewId(null);
    setCharts([
      { id: uid(), title: "Monthly Net Income vs Expense", type: "bar", metric: "both", groupBy: "month", colors: { income: DEFAULT_COLORS.income, expense: DEFAULT_COLORS.expense } },
      { id: uid(), title: "Expenses by Category", type: "pie", metric: "expense", groupBy: "category", colors: { palette: DEFAULT_COLORS.palette } },
      { id: uid(), title: "Income & Expense by Payment Method", type: "bar", metric: "both", groupBy: "payment_method", colors: { income: DEFAULT_COLORS.income, expense: DEFAULT_COLORS.expense } },
    ]);
  }

  async function saveView(updateExisting = false) {
    if (!user) return;

    if (updateExisting && activeView) {
      const { error } = await supabase
        .from("graph_views")
        .update({ charts })
        .eq("id", activeView.id)
        .eq("user_id", user.id);
      if (!error) {
        // refresh list
        const { data } = await supabase
          .from("graph_views").select("id,name,charts").eq("user_id", user.id).order("updated_at", { ascending: false });
        if (data) setViews(data as GraphView[]);
      }
      return;
    }

    // Save as (ask for a name)
    const name = window.prompt("Name this view", activeView?.name || "My view");
    if (!name) return;

    const { data, error } = await supabase
      .from("graph_views")
      .insert([{ user_id: user.id, name, charts }])
      .select("id,name,charts")
      .single();

    if (!error && data) {
      setViews((prev) => [data as GraphView, ...prev]);
      setActiveViewId(data.id);
    }
  }

  async function deleteView() {
    if (!user || !activeView) return;
    if (!window.confirm(`Delete view "${activeView.name}"?`)) return;

    const { error } = await supabase
      .from("graph_views")
      .delete()
      .eq("id", activeView.id)
      .eq("user_id", user.id);

    if (!error) {
      setViews((prev) => prev.filter((v) => v.id !== activeView.id));
      setActiveViewId(null);
    }
  }

  async function renameView() {
  if (!user || !activeView) return;

  const proposed = window.prompt("Rename view", activeView.name);
  if (!proposed) return;

  const name = proposed.trim();
  if (!name || name === activeView.name) return;

  const { error } = await supabase
    .from("graph_views")
    .update({ name })
    .eq("id", activeView.id)
    .eq("user_id", user.id);

  if (!error) {
    // update local list + keep selection
    setViews((prev) => prev.map((v) => (v.id === activeView.id ? { ...v, name } : v)));
  } else {
    // optional: toast/error handling if you use your toast hook here
    console.error(error);
  }
}

  function applyView(v: GraphView) {
    setActiveViewId(v.id);
    setCharts(v.charts);
  }

  return (
    <LeftNav>
      <header className="relative z-10 border-b bg-card/80 backdrop-blur">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Graphs</h1>
              <p className="text-sm text-muted-foreground">Visualize your transactions with customizable charts.</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Views picker */}
              <Select
                value={activeViewId ?? ""}
                onValueChange={(id) => {
                  if (!id) {
                    setActiveViewId(null);
                    return;
                  }
                  const v = views.find((vv) => vv.id === id);
                  if (v) applyView(v);
                }}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="My saved views" />
                </SelectTrigger>
                <SelectContent>
                  {views.length === 0 && <div className="px-3 py-1 text-sm text-muted-foreground">No saved views yet</div>}
                  {views.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={loadExample}>Load Example View</Button>

              <Button onClick={() => setBuilderOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Graph
              </Button>
              <Button variant="outline" onClick={renameView} disabled={!activeView}>
              <Pencil className="h-4 w-4 mr-1" /> Rename
              </Button>

              <Button variant="outline" onClick={() => saveView(true)} disabled={!activeView}>
                <Save className="h-4 w-4 mr-1" /> Save View
              </Button>
              <Button variant="outline" onClick={() => saveView(false)}>
                <SaveAll className="h-4 w-4 mr-1" /> Save As
              </Button>
              <Button variant="destructive" onClick={deleteView} disabled={!activeView}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>

              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full px-4 py-8">
        {charts.length === 0 ? (
          <Card className="p-8 bg-card/80 text-muted-foreground">
            No graphs yet. Click <span className="font-medium text-foreground">Add Graph</span> to create one,
            or <span className="font-medium text-foreground">Load Example View</span>.  
            Use <span className="font-medium text-foreground">Save As</span> to store your layout.
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {datasets.map(({ cfg, data }) => (
              <ChartRenderer
                key={cfg.id}
                cfg={cfg}
                data={data}
                onRemove={() => setCharts((prev) => prev.filter((c) => c.id !== cfg.id))}
                onEditColors={() => setEditTarget(cfg)}
              />
            ))}
          </div>
        )}
      </main>

      <ChartBuilder
        open={builderOpen}
        setOpen={setBuilderOpen}
        onCreate={(cfg) => setCharts((prev) => [cfg, ...prev])}
      />

      {editTarget && (
        <ChartColorsEditor
          open={!!editTarget}
          setOpen={(o) => !o && setEditTarget(null)}
          cfg={editTarget}
          onApply={(colors) =>
            setCharts((prev) =>
              prev.map((c) => (c.id === editTarget.id ? { ...c, colors } : c))
            )
          }
        />
      )}
    </LeftNav>
  );
}
