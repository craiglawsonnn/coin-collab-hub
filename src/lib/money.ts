export function fmtMoney(amount: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount || 0);
  } catch {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(amount || 0);
  }
}
