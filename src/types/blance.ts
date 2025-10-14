export type BalanceScope =
  | { kind: "ALL" }
  | { kind: "ACCOUNT"; accountId: string; name: string; currency: string };
