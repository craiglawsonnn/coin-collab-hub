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
    return () => {
      alive = false;
    };
  }, [base]);

  return { data, loading, error: err };
}
