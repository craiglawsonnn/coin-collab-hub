-- Security fixes for searchable_profiles and exchange_rates

-- 1. Secure searchable_profiles by recreating it as a proper view with security_invoker
-- This fixes the PUBLIC_DATA_EXPOSURE security issue
DROP VIEW IF EXISTS searchable_profiles;

CREATE VIEW searchable_profiles 
WITH (security_invoker = true) AS
SELECT id, full_name, email 
FROM profiles;

-- The view will now inherit RLS policies from the profiles table
-- which already has proper "Users can view their own profile" policy


-- 2. Fix exchange_rates to prevent data manipulation
-- Remove the overly permissive insert policy that allows any user to insert rates
DROP POLICY IF EXISTS "fx insert" ON exchange_rates;

-- Keep the read policy
-- Users can still read rates, but cannot modify them
-- Only the system (via service role or backend functions) should insert rates