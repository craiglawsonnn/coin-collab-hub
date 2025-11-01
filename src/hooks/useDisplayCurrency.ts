import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useDisplayCurrency() {
  const { user } = useAuth();
  const [displayCurrency, setDisplayCurrency] = useState<string>("EUR");  // default
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .single();
      if (!error && data?.preferences?.display_currency) {
        setDisplayCurrency(data.preferences.display_currency);
      }
      setLoading(false);
    })();
  }, [user]);

  const saveDisplayCurrency = async (currency: string) => {
    if (!user) return;
    setDisplayCurrency(currency);
    // merge into existing preferences
    const { data, error } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    const prefs = (data?.preferences ?? {}) as Record<string, any>;
    prefs.display_currency = currency;

    const { error: upErr } = await supabase
      .from("profiles")
      .update({ preferences: prefs })
      .eq("id", user.id);

    if (upErr) throw upErr;
  };

  return { displayCurrency, saveDisplayCurrency, loading };
}
