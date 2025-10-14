// src/hooks/useFxRates.ts
import { useCallback, useEffect, useState } from "react";
import { ensureDailyRates, type FxRow } from "@/lib/fx";

export function useFxRates(base: string = "EUR") {
  const [data, setData] = useState<FxRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const row = await ensureDailyRates(base);
      setData(row);
      setErr(null);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const row = await ensureDailyRates(base);
        if (!cancelled) {
          setData(row);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [base]);

  const isStale =
    data ? new Date().toISOString().slice(0, 10) !== data.rate_date : true;

  return { data, loading, error, isStale, refresh };
}
