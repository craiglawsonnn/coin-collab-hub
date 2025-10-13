-- Fix security warnings for FX functions

-- Update get_rate function with search_path
CREATE OR REPLACE FUNCTION get_rate(_on DATE, _base CHAR(3), _quote CHAR(3))
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r NUMERIC;
BEGIN
  IF _base = _quote THEN RETURN 1; END IF;
  SELECT (rates ->> _quote)::NUMERIC INTO r
  FROM exchange_rates
  WHERE rate_date = _on AND base = _base
  ORDER BY created_at DESC
  LIMIT 1;
  RETURN r;
END;
$$;

-- Update trigger function with search_path
CREATE OR REPLACE FUNCTION trg_tx_snapshot_fx()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r NUMERIC;
BEGIN
  IF NEW.base_currency IS NULL THEN NEW.base_currency := 'EUR'; END IF;

  IF NEW.fx_rate IS NULL THEN
    r := get_rate(NEW.date::DATE, NEW.base_currency, NEW.currency_code);
    IF r IS NULL THEN
      r := 1;
    END IF;
    NEW.fx_rate := r;
  END IF;

  IF NEW.amount_minor IS NOT NULL AND NEW.fx_rate IS NOT NULL THEN
    NEW.base_amount_minor := ROUND(NEW.amount_minor * NEW.fx_rate)::BIGINT;
  END IF;

  RETURN NEW;
END;
$$;