-- Create searchable_profiles view for user search/invite functionality
CREATE OR REPLACE VIEW public.searchable_profiles AS
SELECT
  id,
  full_name,
  email
FROM public.profiles;

-- Grant access to authenticated users only
REVOKE SELECT ON public.searchable_profiles FROM anon;
GRANT SELECT ON public.searchable_profiles TO authenticated;

-- Enable pg_trgm extension for fast text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes for fast ILIKE searches
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON public.profiles USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm
  ON public.profiles USING gin (email gin_trgm_ops);

-- Backfill full_name for profiles that don't have one
UPDATE public.profiles
SET full_name = split_part(email, '@', 1)
WHERE (full_name IS NULL OR length(trim(full_name)) = 0)
  AND email IS NOT NULL;

-- Create graph_views table for storing custom chart views
CREATE TABLE IF NOT EXISTS public.graph_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  charts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on graph_views
ALTER TABLE public.graph_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for graph_views
CREATE POLICY "Users can view their own graph views"
  ON public.graph_views
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own graph views"
  ON public.graph_views
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own graph views"
  ON public.graph_views
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own graph views"
  ON public.graph_views
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to auto-update updated_at
CREATE TRIGGER handle_updated_at_graph_views
  BEFORE UPDATE ON public.graph_views
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();