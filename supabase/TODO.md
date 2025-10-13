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

1) Audit columns (optional but recommended)
alter table public.transactions
  add column if not exists created_at  timestamptz not null default now(),
  add column if not exists updated_at  timestamptz not null default now(),
  add column if not exists created_by  uuid,
  add column if not exists updated_by  uuid;

-- (Optional) link to your profiles table if it's public.profiles
-- alter table public.transactions
--   add constraint transactions_created_by_fk foreign key (created_by) references public.profiles(id) on delete set null,
--   add constraint transactions_updated_by_fk foreign key (updated_by) references public.profiles(id) on delete set null;

-- Trigger to auto-touch updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();


You can set created_by when inserting (e.g., in your API code or a trigger that uses auth.uid()), and updated_by when updating (we’re already sending it in the UI update call).

2) Compute net_flow server-side

If you want the DB to always keep net_flow = coalesce(net_income,0) - coalesce(expense,0):

Option A: generated column (simplest):

alter table public.transactions
  drop column if exists net_flow;

alter table public.transactions
  add column net_flow numeric generated always as (coalesce(net_income,0) - coalesce(expense,0)) stored;


Option B: trigger (if you can’t change the column type):

create or replace function public.compute_net_flow()
returns trigger language plpgsql as $$
begin
  new.net_flow := coalesce(new.net_income, 0) - coalesce(new.expense, 0);
  return new;
end $$;

drop trigger if exists trg_transactions_compute_net_flow_ins on public.transactions;
drop trigger if exists trg_transactions_compute_net_flow_upd on public.transactions;

create trigger trg_transactions_compute_net_flow_ins
before insert on public.transactions
for each row execute function public.compute_net_flow();

create trigger trg_transactions_compute_net_flow_upd
before update of net_income, expense on public.transactions
for each row execute function public.compute_net_flow();


In both cases, don’t send net_flow from the client (the page already complies).

3) Name resolution source

You’re already using searchable_profiles(id, full_name, email). Make sure it exists and is populated. If you only have profiles, create a view:

create or replace view public.searchable_profiles as
select
  id,
  coalesce(full_name, '') as full_name,
  email
from public.profiles;


(Adjust table/column names to your schema.)

4) Indexes for speed
create index if not exists idx_tx_user_date    on public.transactions (user_id, date desc);
create index if not exists idx_tx_user_netflow on public.transactions (user_id, net_flow desc);
create index if not exists idx_tx_created_by   on public.transactions (created_by);
create index if not exists idx_tx_updated_by   on public.transactions (updated_by);

5) RLS policies (sketch)

Owner can select/update/delete their rows.

Shared viewers can select (read-only).

-- If RLS is on:
alter table public.transactions enable row level security;

-- Owner full access
create policy tx_owner_select
on public.transactions
for select
using (user_id = auth.uid());

create policy tx_owner_modify
on public.transactions
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Shared read-only (example if you have a shares table)
-- adjust to your actual share model
create policy tx_shared_read
on public.transactions
for select
using (
  exists (
    select 1
    from public.dashboard_shares s
    where s.owner_id = transactions.user_id
      and s.shared_with_user_id = auth.uid()
      and s.status = 'accepted'
  )
);