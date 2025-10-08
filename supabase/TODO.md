1) Create the view

Expose only minimal fields used for inviting: id, full_name, email.

-- 01_view_searchable_profiles.sql
create or replace view public.searchable_profiles as
select
  id,
  full_name,
  email
from public.profiles;

2) RLS & permissions

RLS on a view inherits from the base table (profiles). We’ll allow authenticated users to SELECT profiles so search can work. (Write policies remain unchanged.)

-- 02_rls_profiles_select.sql
alter table public.profiles enable row level security;

-- Allow signed-in users to read minimal profile info (read-only)
create policy "profiles are readable to authenticated users"
on public.profiles
for select
using (auth.role() = 'authenticated');

-- Optional: make sure anonymous users cannot read
revoke select on public.searchable_profiles from anon;
grant  select on public.searchable_profiles to authenticated;


If you prefer not to grant SELECT on the base table, you can use a SECURITY DEFINER function to return rows, but that’s a more advanced setup. The simple approach above is usually fine for invite search.

3) Speed up search (indexes)

We search with ILIKE on full_name and email. Enable trigram and index those columns.

-- 03_indexes_profiles_trgm.sql
create extension if not exists pg_trgm;

create index if not exists idx_profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);

create index if not exists idx_profiles_email_trgm
  on public.profiles using gin (email gin_trgm_ops);

4) (Optional) Data hygiene

Backfill full_name if you have empty values and want them searchable.

-- 04_backfill_full_name.sql
update public.profiles
set full_name = split_part(email, '@', 1)
where (full_name is null or length(trim(full_name)) = 0)
  and email is not null;

5) Client change

Update InviteManager to query the view.

// Replace the existing search query with this:
const { data, error } = await supabase
  .from("searchable_profiles")
  .select("id, full_name, email")
  .neq("id", user?.id || "")
  .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
  .limit(10);


Tip: debounce and ignore queries shorter than 2 characters to reduce load.

6) Testing checklist

 As an authenticated user, type at least 2 chars in the invite search — results appear.

 Your own profile does not appear (because of .neq('id', user.id)).

 Try searching by name and email, both work.

 Test on a blank account: if no full_name, email still matches.

 Verify anon user (signed out) cannot read from the view (403).

7) Rollback plan

If needed:

drop view if exists public.searchable_profiles;

-- (Optional) drop indexes
drop index if exists idx_profiles_full_name_trgm;
drop index if exists idx_profiles_email_trgm;

-- (Optional) remove policy (only if you want to revert)
drop policy if exists "profiles are readable to authenticated users" on public.profiles;

8) Security notes

This grants read-only access to id, full_name, email for all signed-in users, which is standard for invite flows.

Keep write policies restrictive (e.g., only id = auth.uid() can update their own row).

If you later want tighter control, replace Step 2 with a SECURITY DEFINER function that returns only those 3 columns and grant EXECUTE to authenticated.

9) Migration order

Run SQL in this order:

01_view_searchable_profiles.sql

02_rls_profiles_select.sql

03_indexes_profiles_trgm.sql

04_backfill_full_name.sql (optional)

Then deploy the client change in InviteManager.

Also:
-- Views created by each user
create table if not exists public.graph_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  charts jsonb not null,              -- array of chart configs
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- keep updated_at fresh
create extension if not exists moddatetime with schema extensions;
create trigger handle_updated_at
before update on public.graph_views
for each row execute procedure extensions.moddatetime(updated_at);

alter table public.graph_views enable row level security;
create policy "select own" on public.graph_views
  for select using (auth.uid() = user_id);
create policy "insert own" on public.graph_views
  for insert with check (auth.uid() = user_id);
create policy "update own" on public.graph_views
  for update using (auth.uid() = user_id);
create policy "delete own" on public.graph_views
  for delete using (auth.uid() = user_id);
