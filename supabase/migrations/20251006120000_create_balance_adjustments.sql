-- Create balance_adjustments table to track manual balance rectifications
CREATE TABLE public.balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  as_of DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own adjustments"
  ON public.balance_adjustments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own adjustments"
  ON public.balance_adjustments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own adjustments"
  ON public.balance_adjustments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own adjustments"
  ON public.balance_adjustments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for queries
CREATE INDEX idx_balance_adjustments_user_id ON public.balance_adjustments(user_id);
CREATE INDEX idx_balance_adjustments_created_at ON public.balance_adjustments(created_at DESC);
