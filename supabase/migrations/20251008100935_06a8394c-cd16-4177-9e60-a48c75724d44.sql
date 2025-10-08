-- Add preferences column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- Create balance_adjustments table
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  as_of date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  undone_by uuid REFERENCES auth.users(id),
  undone_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on balance_adjustments
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policies for balance_adjustments
CREATE POLICY "Users can view their own balance adjustments"
  ON public.balance_adjustments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own balance adjustments"
  ON public.balance_adjustments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own balance adjustments"
  ON public.balance_adjustments FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_user ON public.balance_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_transaction ON public.balance_adjustments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_profiles_preferences_gin ON public.profiles USING gin (preferences jsonb_path_ops);

-- Improve dashboard_shares table
-- The dashboard_id will reference the owner's user_id (the person whose dashboard is being shared)
-- The user_id is the person the dashboard is shared WITH
-- The role determines permissions

-- First, ensure we have an enum for roles
DO $$ BEGIN
  CREATE TYPE dashboard_role AS ENUM ('viewer', 'editor', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Recreate dashboard_shares with proper structure
DROP TABLE IF EXISTS public.dashboard_shares CASCADE;

CREATE TABLE public.dashboard_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role dashboard_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  UNIQUE(owner_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.dashboard_shares ENABLE ROW LEVEL SECURITY;

-- Users can see shares where they are the owner OR the recipient
CREATE POLICY "Users can view their own dashboard shares"
  ON public.dashboard_shares FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = shared_with_user_id);

-- Only owners can create shares
CREATE POLICY "Owners can create dashboard shares"
  ON public.dashboard_shares FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owners can update shares
CREATE POLICY "Owners can update their dashboard shares"
  ON public.dashboard_shares FOR UPDATE
  USING (auth.uid() = owner_id);

-- Only owners can delete shares
CREATE POLICY "Owners can delete their dashboard shares"
  ON public.dashboard_shares FOR DELETE
  USING (auth.uid() = owner_id);

-- Create indexes
CREATE INDEX idx_dashboard_shares_owner ON public.dashboard_shares(owner_id);
CREATE INDEX idx_dashboard_shares_shared_with ON public.dashboard_shares(shared_with_user_id);

-- Update transactions RLS to allow viewing shared dashboards
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;

CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.dashboard_shares 
      WHERE dashboard_shares.owner_id = transactions.user_id 
      AND dashboard_shares.shared_with_user_id = auth.uid()
    )
  );

-- Allow editors to insert/update/delete shared transactions
CREATE POLICY "Editors can modify shared transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.dashboard_shares
      WHERE dashboard_shares.owner_id = user_id
      AND dashboard_shares.shared_with_user_id = auth.uid()
      AND dashboard_shares.role IN ('editor', 'admin')
    )
  );

CREATE POLICY "Editors can update shared transactions"
  ON public.transactions FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.dashboard_shares
      WHERE dashboard_shares.owner_id = transactions.user_id
      AND dashboard_shares.shared_with_user_id = auth.uid()
      AND dashboard_shares.role IN ('editor', 'admin')
    )
  );

CREATE POLICY "Editors can delete shared transactions"
  ON public.transactions FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.dashboard_shares
      WHERE dashboard_shares.owner_id = transactions.user_id
      AND dashboard_shares.shared_with_user_id = auth.uid()
      AND dashboard_shares.role IN ('editor', 'admin')
    )
  );