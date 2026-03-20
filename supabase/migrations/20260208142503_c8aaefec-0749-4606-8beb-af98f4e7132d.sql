
-- Create a safe view that excludes the api_key_encrypted column
CREATE VIEW public.workspace_api_keys_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  workspace_id,
  provider,
  display_name,
  is_active,
  created_by,
  created_at,
  updated_at
FROM public.workspace_api_keys;

-- Drop the existing SELECT policy that exposes api_key_encrypted
DROP POLICY IF EXISTS "Workspace admins can view API keys" ON public.workspace_api_keys;

-- Create a new SELECT policy that denies all direct access
-- (The edge function uses service role key which bypasses RLS, so it's unaffected)
CREATE POLICY "No direct select on api keys base table"
ON public.workspace_api_keys
FOR SELECT
TO authenticated
USING (false);
