import { supabase } from "@/integrations/supabase/client";

export type FxRow = {
  provider: string;
  rate_date: string;              // 'YYYY-MM-DD' (ECB business day)
  base: string;                   // e.g. 'EUR'
  rates: Record<string, number>;  // { USD: 1.08, PLN: 4.3, ... }
};

const PROVIDER = "frankfurter";
const BASE_DEFAULT = "EUR";

/**
 * Ensure we have a recent FX row for `base`.
 * Strategy: read newest from DB → (optionally) fallback to localStorage → fetch from Frankfurter → upsert.
 */
export async function ensureDailyRates(base: string = BASE_DEFAULT): Promise<FxRow> {
  // 1) DB first (newest row for base+provider)
  const { data: dbRow } = await supabase
    .from("exchange_rates")
    .select("provider, rate_date, base, rates")
    .eq("provider", PROVIDER)
    .eq("base", base)
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dbRow) return dbRow as FxRow;

  // 2) Best-effort throttle via localStorage (works fine on client)
  const lsKey = `fx:${PROVIDER}:${base}:latest`;
  if (typeof window !== "undefined") {
    const cached = window.localStorage.getItem(lsKey);
    if (cached) {
      try { return JSON.parse(cached) as FxRow; } catch {}
    }
  }

  // 3) Fetch from free API (ECB). /latest returns the most recent business day.
  const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error("Failed to fetch FX rates");
  const json = (await res.json()) as { base: string; date: string; rates: Record<string, number> };

  const row: FxRow = {
    provider: PROVIDER,
    rate_date: json.date,
    base: json.base,
    rates: json.rates,
  };

  // 4) Upsert (idempotent due to unique (provider, rate_date, base))
  const { error: upsertErr } = await supabase
    .from("exchange_rates")
    .upsert(row, { onConflict: "provider,rate_date,base" });
  if (upsertErr) {
    // Non-fatal: UI can still use the fetched `row`
    console.warn("FX upsert warning:", upsertErr.message);
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(lsKey, JSON.stringify(row));
  }
  return row;
}

/**
 * Convert a minor-unit amount (e.g., cents) from -> to using a single FxRow.
 * Frankfurter quotes are target-per-base (e.g., base=EUR, USD=1.08 means 1 EUR = 1.08 USD).
 */
export function convertMinor(amountMinor: number, from: string, to: string, fx: FxRow): number {
  if (from === to) return amountMinor;

  // base -> quote
  if (from === fx.base) {
    const rTo = fx.rates[to] ?? 1;
    return Math.round(amountMinor * rTo);
  }

  // quote -> base
  if (to === fx.base) {
    const rFrom = fx.rates[from] ?? 1;
    return Math.round(amountMinor / rFrom);
  }

  // cross via base
  const rFrom = fx.rates[from] ?? 1;
  const rTo = fx.rates[to] ?? 1;
  return Math.round(amountMinor * (rTo / rFrom));
}
