alter table public.user_accounts enable row level security;
create policy ua_owner_read  on public.user_accounts for select using (user_id = auth.uid());
create policy ua_owner_write on public.user_accounts for update using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.transactions
  add column if not exists amount_minor bigint,
  add column if not exists currency_code char(3) not null default 'EUR';

-- Table (you already have these columns; run idempotently)
create table if not exists public.exchange_rates (
  id bigserial primary key,
  provider   text not null default 'frankfurter',
  rate_date  date not null,                -- ECB “business day” date of the snapshot
  base       char(3) not null,             -- e.g. 'EUR'
  rates      jsonb not null,               -- { "USD": 1.08, "PLN": 4.3, ... }
  created_at timestamptz not null default now(),
  unique(provider, rate_date, base)
);

-- Row Level Security (if you use RLS)
alter table public.exchange_rates enable row level security;

-- Allow signed-in users to read and insert (we only UPSERT new business days)
create policy if not exists "fx select" on public.exchange_rates
  for select to authenticated using (true);

create policy if not exists "fx insert" on public.exchange_rates
  for insert  to authenticated with check (true);



Fix Light mode background
auto update on the balance adjustment table same as recent transactions
Check readability on mobile
make the add view work better
allow users to set automatic income tax percentage in the settings
CHAT ROOM?
import via csv support?
Add more functionality in settings menu 