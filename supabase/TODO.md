# TODO: Apply and verify `balance_adjustments` migration

Purpose
- The app now expects a `public.balance_adjustments` table (migration file: `supabase/migrations/20251006120000_create_balance_adjustments.sql`).
- This TODO lists the exact DB-side steps to apply the migration, verify it, add a rollback, and follow-up tasks (types, tests, and removing runtime `any` casts).

Files of interest
- Migration SQL (already present): `supabase/migrations/20251006120000_create_balance_adjustments.sql`
- App code that uses the table:
  - `src/components/BalanceAdjustment.tsx` (inserts into `balance_adjustments`)
  - `src/components/AdjustmentList.tsx` (reads/deletes from `balance_adjustments`)

Checklist: apply migration (local or remote)
1. If you run a local Supabase dev stack (Docker / supabase CLI):

   - Ensure the local stack is running:
     ```bash
    TODO: Database tasks to apply and verify schema changes for implemented features

    This checklist collects all DB-side work you need to perform so the running Supabase database matches the features implemented in the app.
    It covers migrations present in this repo, verification steps, RLS/policy checks, type updates, backfills, and rollbacks.

    Summary of schema changes present in the repo
    - `supabase/migrations/20251006120000_create_balance_adjustments.sql` — table `public.balance_adjustments` (used by BalanceAdjustment and AdjustmentList).
    - `supabase/migrations/20251006_add_profiles_preferences.sql` — adds `preferences jsonb` column to `public.profiles` (used to store user dashboard preferences & custom views).

    Prerequisites
    - Have the Supabase CLI installed and authenticated if you plan to use it locally or against a hosted project: https://supabase.com/docs/guides/cli
    - If working with production data, create a DB backup / export first.

    1) Apply migrations (recommended: staging -> production)

    - Local dev (supabase CLI recommended):

      ```bash
      # start local dev db (if not running)
      supabase start

      # push migrations from repo to the DB (applies all unapplied migrations)
      supabase db push
      # or deploy migrations if using the migrations flow:
      supabase migrations deploy
      ```

    - Hosted Supabase project:

      ```bash
      supabase login
      supabase link --project-ref <project-ref>
      supabase db push
      ```

    - Alternatively, apply an individual SQL file directly (psql or Supabase SQL editor):

      ```bash
      psql "postgresql://<user>:<pw>@<host>:5432/<db>?sslmode=require" -f supabase/migrations/20251006120000_create_balance_adjustments.sql
      psql "postgresql://<user>:<pw>@<host>:5432/<db>?sslmode=require" -f supabase/migrations/20251006_add_profiles_preferences.sql
      ```

    2) Verification (schema & basic sanity)

    - Check tables/columns exist and inspect columns:

      ```sql
      -- run in psql or Supabase SQL editor
      \dt public.balance_adjustments
      SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='balance_adjustments';
      SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles';
      SELECT preferences FROM public.profiles LIMIT 5;
      ```

    - Confirm migrations applied (supabase CLI will list migrations) or check migration table in DB:
      - `SELECT * FROM supabase_migrations.order_migrations LIMIT 20;` (or equivalent depending on CLI/migrations setup)

    3) RLS / Policies

    - Verify Row-Level Security (RLS) policies for the new table and for profiles (if you rely on RLS for profile updates):

      ```sql
      -- policies for balance_adjustments (example queries)
      SELECT policyname, cmd, permissive FROM pg_policies WHERE schemaname='public' AND tablename='balance_adjustments';
      -- If policies are missing, consider adding these example policies (adjust to your security model):
      BEGIN;
      CREATE POLICY "balance_adjustments_allow_owner_select" ON public.balance_adjustments FOR SELECT USING (user_id = auth.uid());
      CREATE POLICY "balance_adjustments_allow_owner_insert" ON public.balance_adjustments FOR INSERT WITH CHECK (user_id = auth.uid());
      CREATE POLICY "balance_adjustments_allow_owner_delete" ON public.balance_adjustments FOR DELETE USING (user_id = auth.uid());
      COMMIT;
      ```

    - For `profiles` you may already have RLS; ensure the authenticated user can update their own `preferences` value. Example policy:

      ```sql
      -- allow a user to update only their own profile row
      CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
      ```

    4) Backfills & data hygiene

    - Backfill `preferences` for existing profiles (sets to empty object if NULL):

      ```sql
      UPDATE public.profiles SET preferences = '{}'::jsonb WHERE preferences IS NULL;
      ```

    - If you have pre-existing adjustments data to migrate into the new table, prepare and run a targeted migration script (not included here).

    5) Indexes & performance

    - If you query `preferences` JSONB keys often (e.g., customViews), consider a GIN index:

      ```sql
      CREATE INDEX IF NOT EXISTS idx_profiles_preferences_gin ON public.profiles USING gin (preferences jsonb_path_ops);
      ```

    - For `balance_adjustments`, if you query by user or transaction often, add indexes:

      ```sql
      CREATE INDEX IF NOT EXISTS idx_balance_adjustments_user ON public.balance_adjustments (user_id);
      CREATE INDEX IF NOT EXISTS idx_balance_adjustments_tx ON public.balance_adjustments (transaction_id);
      ```

    6) Types / TypeScript updates

    - If you use generated Supabase types, regenerate them so `src/integrations/supabase/types.ts` matches the DB. Example (using supabase CLI):

      ```bash
      # generate types to stdout or write to a file
      supabase gen types typescript --project-ref <project-ref> > supabase-types.ts
      ```

    - If you maintain the types manually (file in this repo: `src/integrations/supabase/types.ts`) ensure it contains:

      - `profiles.Row` includes `preferences: Json | null` (we added this earlier).
      - `balance_adjustments` table definition under `public.Tables` with Row/Insert/Update types. Example shape:

      ```ts
      balance_adjustments: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          amount: string; // decimal types map to string in the generated types
          as_of: string; // date
          note: string | null;
          undone_by?: string | null;
          undone_at?: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id: string;
          amount: string | number;
          as_of?: string;
          note?: string | null;
          undone_by?: string | null;
          undone_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string;
          amount?: string | number;
          as_of?: string;
          note?: string | null;
          undone_by?: string | null;
          undone_at?: string | null;
          created_at?: string | null;
        };
      }
      ```

    - After updating types, remove any `(supabase as any)` casts in code (search the repo) and run `npx tsc --noEmit` to validate.

    7) App-level verification (manual QA checklist)

    - Start the app and exercise these flows as the logged-in user (and another test user if possible):
      - Rectify balance: use the UI (BalanceAdjustment) to create a corrective transaction and a `balance_adjustments` record. Inspect both tables to confirm rows were created.
      - Adjustment list: view Undo / Permanent Delete flows in `AdjustmentList` — ensure undo inserts a reversing transaction and marks the adjustment undone (or deletes as per your implemention).
      - Profile preferences: open the dashboard settings dialog, toggle cards and create a custom view, click Save. Reload the page — settings and created views should persist.
      - Account balances dialog: open and confirm account aggregation and that empty lists show €0.00.

    8) Rollback (prepare down migrations)

    - For each up migration you applied, prepare a down migration SQL file in `supabase/migrations` that reverts the change. Examples:

      - Drop the `preferences` column:
        ```sql
        ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS preferences;
        ```

      - Drop the `balance_adjustments` table:
        ```sql
        DROP TABLE IF EXISTS public.balance_adjustments;
        ```

    - Apply rollbacks only after verifying you won't lose production-critical data. Prefer testing rollbacks in a staging environment first.

    9) CI / Tests

    - Add CI steps to validate DB and code compatibility:
      - `npx tsc --noEmit` (typecheck)
      - Optionally run integration tests that exercise DB migrations against a disposable test DB or mock Supabase responses.

    10) Cleanup & follow-ups

    - Remove all runtime `any` casts for Supabase client once types are updated.
    - Consider adding automated tests for the key flows (adjustment, preferences persistence).

    Quick verification SQL snippets

    ```sql
    -- check latest adjustments
    SELECT * FROM public.balance_adjustments ORDER BY created_at DESC LIMIT 10;

    -- check profiles preferences for a user
    SELECT id, preferences FROM public.profiles WHERE id = '<user-id>' LIMIT 1;

    -- check transactions created by rectification (example description)
    SELECT * FROM public.transactions WHERE description ILIKE '%RECTIFIED%' ORDER BY created_at DESC LIMIT 10;
    ```

    If you'd like, I can:
    - Draft down-migration SQL files and add them to `supabase/migrations`.
    - Regenerate or fully update the TypeScript DB types for you (or patch `src/integrations/supabase/types.ts` to include `balance_adjustments` if you prefer explicit edits). Note: this repo already contains a manual `types.ts` that we updated with `preferences` — we can add `balance_adjustments` there as well.
    - Add a small verification script (Node) that performs the common QA steps (create adjustment, query rows, cleanup) against a test Supabase project.

    ---

    Keep this file updated with any further schema changes. Once migrations are applied to your target environment, mark the tasks as done.
