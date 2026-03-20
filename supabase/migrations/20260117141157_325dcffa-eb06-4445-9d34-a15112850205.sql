-- Fix SECURITY DEFINER view issue
-- The workspace_members_public view should use SECURITY INVOKER (default in PostgreSQL 15+)
-- For older versions, we recreate as a regular view which respects caller's permissions

DROP VIEW IF EXISTS public.workspace_members_public;

-- Recreate view without SECURITY DEFINER (uses invoker by default)
-- This ensures the view respects the RLS policies of the querying user
CREATE VIEW public.workspace_members_public 
WITH (security_invoker = true)
AS
SELECT 
  tm.id,
  tm.workspace_id,
  tm.user_id,
  tm.role,
  tm.accepted_at,
  tm.invited_at,
  -- Mask email for non-admins
  CASE 
    WHEN tm.user_id = auth.uid() THEN tm.email
    WHEN EXISTS (
      SELECT 1 FROM workspaces w WHERE w.id = tm.workspace_id AND w.created_by = auth.uid()
    ) THEN tm.email
    WHEN EXISTS (
      SELECT 1 FROM team_members admin_tm 
      WHERE admin_tm.workspace_id = tm.workspace_id 
      AND admin_tm.user_id = auth.uid() 
      AND admin_tm.role = 'owner' 
      AND admin_tm.accepted_at IS NOT NULL
    ) THEN tm.email
    ELSE 
      LEFT(tm.email, 2) || '***@' || SPLIT_PART(tm.email, '@', 2)
  END as email,
  tm.invited_by
FROM public.team_members tm
WHERE tm.accepted_at IS NOT NULL
AND (
  tm.user_id = auth.uid() OR
  is_workspace_member(tm.workspace_id)
);

GRANT SELECT ON public.workspace_members_public TO authenticated;