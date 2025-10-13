Yep—you can do this entirely client-side. The pattern is:

Try to read today’s cached rates from your exchange_rates table.

If missing/stale, the first user who opens the app that day will fetch from a free API (e.g., Frankfurter) and upsert into Supabase.

Everyone else just reads from the cache.

Because we use a unique constraint + upsert, multiple clients can race safely.

Below is everything you need.

DB prerequisites (once)

Unique key + RLS policies so signed-in users can read and upsert:

-- unique key ensures safe upserts
alter table exchange_rates
  add constraint exchange_rates_uniq unique (provider, rate_date, base);

-- enable RLS if not enabled
alter table exchange_rates enable row level security;

-- allow authenticated users to read
create policy "fx select" on exchange_rates
for select to authenticated
using (true);

-- allow authenticated users to insert/upsert today's row
create policy "fx insert" on exchange_rates
for insert to authenticated
with check (true);

-- (optional) block updates: we only upsert. If you do allow update:
-- create policy "fx update" on exchange_rates for update to authenticated using (true) with check (true);


Keep the table structure we discussed earlier: (provider text, rate_date date, base char(3), rates jsonb, …).

A tiny client util: ensure the day’s rates exist

Uses Frankfurter (free, ECB, no key).

Uses /latest because weekends/holidays won’t have “today” data.

Caches once in localStorage to avoid duplicate upserts from the same browser.

// src/lib/fx.ts
import { supabase } from "@/integrations/supabase/client";

type FxRow = {
  provider: string;
  rate_date: string; // yyyy-mm-dd
  base: string;
  rates: Record<string, number>;
};

const PROVIDER = "frankfurter";
const BASE_DEFAULT = "EUR";

/** Load today's cached rates; if missing, first caller fetches & upserts. */
export async function ensureDailyRates(base: string = BASE_DEFAULT) {
  // 1) Check DB first
  const { data: dbRow, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .eq("provider", PROVIDER)
    .eq("base", base)
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle<FxRow>();

  // 2) If row exists from today (or you accept "latest"), return it
  const today = new Date().toISOString().slice(0, 10);
  if (!error && dbRow) {
    // if you prefer strictly "today", compare dates here
    return dbRow; // { provider, rate_date, base, rates }
  }

  // 3) Throttle via localStorage (best-effort)
  const lsKey = `fx:${PROVIDER}:${base}:latest`;
  const cached = localStorage.getItem(lsKey);
  if (cached) {
    try {
      return JSON.parse(cached) as FxRow;
    } catch {}
  }

  // 4) Fetch from free API (Frankfurter)
  // /latest returns { amount, base, date, rates: {...} }
  const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error("Failed to fetch FX rates");
  const json = await res.json() as { base: string; date: string; rates: Record<string, number> };

  const row: FxRow = {
    provider: PROVIDER,
    rate_date: json.date, // business day date (ECB)
    base: json.base,
    rates: json.rates,
  };

  // 5) Upsert into Supabase (idempotent thanks to unique constraint)
  await supabase
    .from("exchange_rates")
    .upsert(row, { onConflict: "provider,rate_date,base" });

  localStorage.setItem(lsKey, JSON.stringify(row));
  return row;
}

/** Convert minor units via cross rate from a DB row */
export function convertMinor(
  amountMinor: number,
  from: string,
  to: string,
  fx: FxRow
) {
  if (from === to) return amountMinor;
  if (from === fx.base) {
    const rTo = fx.rates[to] ?? 1;
    return Math.round(amountMinor * rTo);
  }
  if (to === fx.base) {
    const rFrom = fx.rates[from] ?? 1;
    return Math.round(amountMinor / rFrom);
  }
  const rFrom = fx.rates[from] ?? 1;
  const rTo = fx.rates[to] ?? 1;
  return Math.round(amountMinor * (rTo / rFrom));
}

A simple hook you can use anywhere
// src/hooks/useFxRates.ts
import { useEffect, useState } from "react";
import { ensureDailyRates } from "@/lib/fx";

export function useFxRates(base: string = "EUR") {
  const [data, setData] = useState<{
    base: string;
    date: string;
    rates: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<unknown>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const row = await ensureDailyRates(base);
        if (!alive) return;
        setData({ base: row.base, date: row.rate_date, rates: row.rates });
      } catch (e) {
        if (alive) setErr(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [base]);

  return { data, loading, error: err };
}

Wiring it into your “Account Balances” modal
import { useFxRates } from "@/hooks/useFxRates";
import { convertMinor } from "@/lib/fx";

const displayCcy = /* 'ORIGINAL' | 'EUR' | 'PLN' ... from state */;

const { data: fx, loading } = useFxRates("EUR");

function renderAmount(aMinor: number, from: string) {
  if (displayCcy === "ORIGINAL" || !fx) return formatMoney(aMinor, from);
  const converted = convertMinor(aMinor, from, displayCcy, {
    provider: "frankfurter", rate_date: fx.date, base: fx.base, rates: fx.rates
  });
  return formatMoney(converted, displayCcy);
}


formatMoney = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountMinor/100).



Implement currencies system
Allow users to edit or ammend an entry
Set a budget
Set recurring charges
Fix Light mode background
auto update on the balance adjustment table same as recent transactions
Check readability on mobile
make the add view work better
allow users to set automatic income tax percentage in the settings
CHAT ROOM?
import via csv support?
Add more functionality in settings menu 