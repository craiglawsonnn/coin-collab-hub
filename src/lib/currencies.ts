// src/lib/currencies.ts

/** Common ISO-4217 currency codes you support in the UI. */
export const CURRENCIES = [
  "EUR","USD","GBP","PLN","CHF","JPY","AUD","CAD","SEK","NOK","DKK",
  "CZK","HUF","RON","BGN","TRY","ZAR","MXN","BRL","INR","KRW","CNY",
  "HKD","SGD","NZD","ILS","AED","SAR"
] as const;

export type CurrencyCode = typeof CURRENCIES[number];

/** Minor units (number of decimal places) for each currency. */
export const MINOR_UNITS: Record<CurrencyCode, number> = {
  EUR: 2, USD: 2, GBP: 2, PLN: 2, CHF: 2, JPY: 0, AUD: 2, CAD: 2,
  SEK: 2, NOK: 2, DKK: 2, CZK: 2, HUF: 2, RON: 2, BGN: 2, TRY: 2,
  ZAR: 2, MXN: 2, BRL: 2, INR: 2, KRW: 0, CNY: 2, HKD: 2, SGD: 2,
  NZD: 2, ILS: 2, AED: 2, SAR: 2,
};

/** Optional symbols for quick labels. Use Intl for real formatting. */
export const SYMBOLS: Partial<Record<CurrencyCode, string>> = {
  EUR: "€", USD: "$", GBP: "£", PLN: "zł", CHF: "Fr", JPY: "¥",
  AUD: "$", CAD: "$", SEK: "kr", NOK: "kr", DKK: "kr", CZK: "Kč",
  HUF: "Ft", RON: "lei", BGN: "лв", TRY: "₺", ZAR: "R", MXN: "$",
  BRL: "R$", INR: "₹", KRW: "₩", CNY: "¥", HKD: "$", SGD: "$",
  NZD: "$", ILS: "₪", AED: "د.إ", SAR: "ر.س",
};

/** Convert a major-unit amount (e.g., 12.34) to minor units (e.g., 1234). */
export function toMinor(amountMajor: number, currency: CurrencyCode): number {
  const d = MINOR_UNITS[currency] ?? 2;
  return Math.round(amountMajor * Math.pow(10, d));
}

/** Convert minor units to major (e.g., 1234 -> 12.34). */
export function fromMinor(amountMinor: number, currency: CurrencyCode): number {
  const d = MINOR_UNITS[currency] ?? 2;
  return amountMinor / Math.pow(10, d);
}

/** Format a minor-unit amount using Intl.NumberFormat. */
export function formatMoneyMinor(
  amountMinor: number,
  currency: CurrencyCode,
  locale?: string
): string {
  const value = fromMinor(amountMinor, currency);
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}

/** Quick guard for inputs. */
export function isCurrencyCode(v: string): v is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(v);
}

/** App-wide default base (used by FX & KPIs). */
export const DEFAULT_BASE_CURRENCY: CurrencyCode = "EUR";
