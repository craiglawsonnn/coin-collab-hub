-- accounts (each wallet has a native currency)
alter table accounts add column if not exists currency_code char(3) not null default 'EUR';

-- transactions
alter table transactions
  add column if not exists amount_minor bigint,         -- e.g. -1200 = -€12.00
  add column if not exists currency_code char(3) not null default 'EUR',
  add column if not exists fx_rate numeric(18,8),       -- snapshot: 1 unit of currency_code -> base_currency
  add column if not exists base_currency char(3) not null default 'EUR',
  add column if not exists base_amount_minor bigint;     -- amount converted to base at snapshot fx_rate

-- (optional) per-user preference
alter table profiles
  add column if not exists base_currency char(3) not null default 'EUR';

create table if not exists exchange_rates (
  id bigserial primary key,
  provider text not null default 'frankfurter',
  rate_date date not null,                  -- rates as-of date (UTC)
  base char(3) not null,                    -- e.g. 'EUR'
  rates jsonb not null,                     -- { "USD": 1.08, "PLN": 4.3, ... }
  created_at timestamptz not null default now(),
  unique (provider, rate_date, base)
);

create or replace function get_rate(_on date, _base char(3), _quote char(3))
returns numeric as $$
declare r numeric;
begin
  if _base = _quote then return 1; end if;
  select (rates ->> _quote)::numeric into r
  from exchange_rates
  where rate_date = _on and base = _base
  order by created_at desc
  limit 1;
  return r;
end;
$$ language plpgsql stable;

create or replace function trg_tx_snapshot_fx()
returns trigger as $$
declare r numeric;
begin
  -- If not provided, default snapshot base to user's preference or 'EUR'
  if new.base_currency is null then new.base_currency := 'EUR'; end if;

  -- If fx_rate is not supplied, look it up from cache by tx date (::date)
  if new.fx_rate is null then
    r := get_rate(new.date::date, new.base_currency, new.currency_code);
    if r is null then
      -- last resort: set to 1 so we don't block inserts; you can backfill later
      r := 1;
    end if;
    new.fx_rate := r;
  end if;

  -- compute base amount
  if new.amount_minor is not null and new.fx_rate is not null then
    new.base_amount_minor := round(new.amount_minor * new.fx_rate)::bigint;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists tx_snapshot_fx on transactions;
create trigger tx_snapshot_fx
before insert or update of amount_minor, currency_code, base_currency, date, fx_rate
on transactions
for each row execute function trg_tx_snapshot_fx();
