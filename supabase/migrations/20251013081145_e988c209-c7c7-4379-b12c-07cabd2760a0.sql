-- Multi-currency support and budgets

-- 1. Add currency column to user_accounts table
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS currency_code CHAR(3) NOT NULL DEFAULT 'EUR';

-- 2. Add currency columns to transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(18,8),
  ADD COLUMN IF NOT EXISTS base_currency CHAR(3) NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS base_amount_minor BIGINT;

-- 3. Add base_currency to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS base_currency CHAR(3) NOT NULL DEFAULT 'EUR';

-- 4. Create exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'frankfurter',
  rate_date DATE NOT NULL,
  base CHAR(3) NOT NULL,
  rates JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, rate_date, base)
);

-- Enable RLS on exchange_rates
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies for exchange_rates
CREATE POLICY "fx select" ON exchange_rates
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "fx insert" ON exchange_rates
FOR INSERT TO authenticated
WITH CHECK (true);

-- 5. Create function to get exchange rate
CREATE OR REPLACE FUNCTION get_rate(_on DATE, _base CHAR(3), _quote CHAR(3))
RETURNS NUMERIC AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- 6. Create trigger function for FX snapshot
CREATE OR REPLACE FUNCTION trg_tx_snapshot_fx()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 7. Create trigger
DROP TRIGGER IF EXISTS tx_snapshot_fx ON transactions;
CREATE TRIGGER tx_snapshot_fx
BEFORE INSERT OR UPDATE OF amount_minor, currency_code, base_currency, date, fx_rate
ON transactions
FOR EACH ROW EXECUTE FUNCTION trg_tx_snapshot_fx();

-- 8. Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT,
  amount NUMERIC NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'EUR',
  period TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT budgets_user_category_unique UNIQUE (user_id, category, period)
);

-- Enable RLS on budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- RLS policies for budgets
CREATE POLICY "Users can view their own budgets"
ON budgets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets"
ON budgets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
ON budgets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
ON budgets FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger for budgets
CREATE TRIGGER update_budgets_updated_at
BEFORE UPDATE ON budgets
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();