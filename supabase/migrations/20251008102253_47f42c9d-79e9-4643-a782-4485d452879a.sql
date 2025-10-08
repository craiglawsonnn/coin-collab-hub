-- Add status column to dashboard_shares for invite workflow
CREATE TYPE dashboard_invite_status AS ENUM ('pending', 'accepted', 'rejected');

ALTER TABLE public.dashboard_shares 
ADD COLUMN status dashboard_invite_status NOT NULL DEFAULT 'pending';

-- Add index for better query performance
CREATE INDEX idx_dashboard_shares_status ON public.dashboard_shares(status);

-- Update existing shares to accepted status
UPDATE public.dashboard_shares SET status = 'accepted' WHERE status = 'pending';