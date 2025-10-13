import { supabase } from "@/integrations/supabase/client";

type FxRow = {
  provider: string;
  rate_date: string;
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
    .maybeSingle();

  // 2) If row exists from today (or you accept "latest"), return it
  const today = new Date().toISOString().slice(0, 10);
  if (!error && dbRow) {
    return dbRow as FxRow;
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
  const res = await fetch(
    `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`
  );
  if (!res.ok) throw new Error("Failed to fetch FX rates");
  const json = (await res.json()) as {
    base: string;
    date: string;
    rates: Record<string, number>;
  };

  const row: FxRow = {
    provider: PROVIDER,
    rate_date: json.date,
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
