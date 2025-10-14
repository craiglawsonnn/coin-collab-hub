import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCIES } from "@/lib/currencies";
import { useFxRates } from "@/hooks/useFxRates";
import { convertMinor } from "@/lib/fx";

type AccountRow = {
  id: string;
  account_name: string;
  currency_code: string;
};

type TxRow = {
  account: string;             // name (legacy)
  amount_minor: number | null; // optional
  net_flow: number | null;     // major units (+/-)
  currency_code: string | null;
};

export default function AccountBalances() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // UI state
  const [displayCurrency, setDisplayCurrency] = useState<string>("EUR");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [rows, setRows] = useState<
    { id: string; name: string; currency: string; balanceMinor: number }[]
  >([]);

  const { toast } = useToast();
  const { user } = useAuth();

  // FX (convert to displayCurrency)
  const { data: fx } = useFxRates("EUR");

  const fmt = useMemo(
    () => (minor: number, currency: string) =>
      new Intl.NumberFormat(undefined, { style: "currency", currency }).format(minor / 100),
    []
  );

  // Load accounts + tx aggregates when dialog opens
  useEffect(() => {
    if (!open || !user?.id) return;

    (async () => {
      setLoading(true);
      try {
        const { data: accData, error: accErr } = await supabase
          .from("user_accounts")
          .select("id, account_name, currency_code")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("account_name");

        if (accErr) throw accErr;
        const accounts = (accData ?? []) as AccountRow[];

        const { data: txData, error: txErr } = await supabase
          .from("transactions")
          .select("account, amount_minor, net_flow, currency_code")
          .eq("user_id", user.id);

        if (txErr) throw txErr;
        const txs = (txData ?? []) as TxRow[];

        const sumByAcc = new Map<string, { minor: number; sawMinor: boolean; txCcy?: string }>();

        for (const t of txs) {
          const key = t.account || "(unknown)";
          const bucket = sumByAcc.get(key) ?? { minor: 0, sawMinor: false, txCcy: undefined };
          if (Number.isFinite(t.amount_minor)) {
            bucket.minor += t.amount_minor ?? 0;
            bucket.sawMinor = true;
          } else if (Number.isFinite(t.net_flow)) {
            bucket.minor += Math.round((t.net_flow ?? 0) * 100);
          }
          if (!bucket.txCcy && t.currency_code) bucket.txCcy = t.currency_code;
          sumByAcc.set(key, bucket);
        }

        const uiRows = accounts.map((a) => {
          const bucket = sumByAcc.get(a.account_name);
          const balanceMinor = bucket?.minor ?? 0;
          const currency = bucket?.txCcy || a.currency_code || "EUR";
          return { id: a.id, name: a.account_name, currency, balanceMinor };
        });

        // Default highlight: first account
        if (!highlightId && uiRows.length > 0) setHighlightId(uiRows[0].id);

        // sort by balance desc
        uiRows.sort((x, y) => y.balanceMinor - x.balanceMinor);
        setRows(uiRows);
      } catch (err: any) {
        toast({
          title: "Error fetching balances",
          description: err.message || String(err),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert to display currency
  const rowsWithDisplay = useMemo(() => {
    return rows.map((r) => {
      if (!fx || displayCurrency === r.currency) {
        return { ...r, displayMinor: r.balanceMinor };
      }
      const displayMinor = convertMinor(r.balanceMinor, r.currency, displayCurrency, {
        provider: "frankfurter",
        rate_date: fx.rate_date,
        base: fx.base,
        rates: fx.rates,
      });
      return { ...r, displayMinor };
    });
  }, [rows, fx, displayCurrency]);

  // Combined total in display currency
  const totalDisplayMinor = useMemo(
    () => rowsWithDisplay.reduce((s, r) => s + r.displayMinor, 0),
    [rowsWithDisplay]
  );

  // Pin the highlighted account on top
  const ordered = useMemo(() => {
    if (!highlightId) return rowsWithDisplay;
    const hi = rowsWithDisplay.find((r) => r.id === highlightId);
    const rest = rowsWithDisplay.filter((r) => r.id !== highlightId);
    return hi ? [hi, ...rest] : rowsWithDisplay;
  }, [rowsWithDisplay, highlightId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Accounts"
          className="group hover:bg-primary hover:text-white focus:bg-primary focus:text-white active:bg-primary active:text-white"
        >
          <Wallet className="h-5 w-5 text-primary transition-colors group-hover:text-white group-focus:text-white group-active:text-white" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Account Balances</DialogTitle>
              <DialogDescription>
                Highlight an account, view all balances, and switch display currency.
              </DialogDescription>
            </div>
            {/* Display currency dropdown */}
            <div className="min-w-[120px]">
              <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="EUR" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((ccy) => (
                    <SelectItem key={ccy} value={ccy}>
                      {ccy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {/* Combined total */}
        <div className="px-1 pb-3">
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
            <div className="text-sm text-muted-foreground">Combined total</div>
            <div className="font-semibold tabular-nums">
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: displayCurrency,
              }).format(totalDisplayMinor / 100)}
            </div>
          </div>
        </div>

        {/* List of accounts */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground px-1">Loading…</p>
          ) : ordered.length === 0 ? (
            <div className="flex items-center justify-between py-2 px-1">
              <span className="text-sm text-muted-foreground">No accounts</span>
              <span className="font-medium">€0.00</span>
            </div>
          ) : (
            ordered.map((r) => {
              const isHi = r.id === highlightId;
              return (
                <button
                  key={r.id}
                  onClick={() => setHighlightId(r.id)}
                  className={[
                    "w-full text-left rounded-xl border px-3 py-2 transition",
                    isHi
                      ? "border-primary/60 bg-primary/10 shadow-[0_0_0_2px_var(--primary)/10]"
                      : "border-transparent hover:bg-muted/30",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isHi && <Star className="h-4 w-4 text-primary" />}
                      <div className="flex flex-col">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.currency}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: displayCurrency,
                        }).format(r.displayMinor / 100)}
                      </div>
                      {/* show original currency below if different */}
                      {displayCurrency !== r.currency && (
                        <div className="text-xs text-muted-foreground tabular-nums">
                          ({new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: r.currency,
                          }).format(r.balanceMinor / 100)})
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
