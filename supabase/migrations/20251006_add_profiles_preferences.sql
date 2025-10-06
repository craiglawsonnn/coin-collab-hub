-- Add a JSONB preferences column to profiles so user-specific settings can be stored
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- Optionally, you can later create indexes on frequently queried preference keys.
