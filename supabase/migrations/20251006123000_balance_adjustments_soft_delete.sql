-- Add soft-delete / undo columns to balance_adjustments
ALTER TABLE public.balance_adjustments
  ADD COLUMN IF NOT EXISTS is_undone BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS undone_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS undone_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for undone_at
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_undone_at ON public.balance_adjustments(undone_at DESC);
