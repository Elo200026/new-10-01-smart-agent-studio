-- =====================================================
-- SECURITY FIX: Properly secure marketplace and team views
-- =====================================================

-- 1. Drop existing views to recreate with proper security
DROP VIEW IF EXISTS public.marketplace_items_public;
DROP VIEW IF EXISTS public.workspace_members_public;

-- 2. Recreate marketplace_items_public view WITH security_invoker
-- This view is INTENTIONALLY public for browsing marketplace items
-- It excludes sensitive publisher identification data
CREATE VIEW public.marketplace_items_public
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  description,
  item_type,
  config_data,
  canvas_data,
  agent_count,
  tags,
  category,
  download_count,
  rating,
  rating_count,
  created_at,
  updated_at,
  is_public
  -- SECURITY: publisher_id and publisher_workspace_id are intentionally excluded
FROM public.marketplace_items
WHERE is_public = true;

-- 3. Recreate workspace_members_public view WITH security_invoker
-- This view masks emails for non-admin users and requires workspace membership
CREATE VIEW public.workspace_members_public
WITH (security_invoker = on) AS
SELECT 
  tm.id,
  tm.workspace_id,
  tm.user_id,
  tm.role,
  tm.invited_at,
  tm.accepted_at,
  tm.invited_by,
  -- SECURITY: Only show full email to admins or the user's own record
  CASE 
    WHEN tm.user_id = auth.uid() THEN tm.email
    WHEN public.is_workspace_admin(tm.workspace_id) THEN tm.email
    ELSE CONCAT(LEFT(tm.email, 2), '***@***', RIGHT(tm.email, 4))
  END AS email
FROM public.team_members tm
WHERE 
  -- SECURITY: Only accessible to workspace members (not public!)
  tm.workspace_id IN (
    SELECT w.id FROM public.workspaces w WHERE w.created_by = auth.uid()
    UNION
    SELECT tm2.workspace_id FROM public.team_members tm2 WHERE tm2.user_id = auth.uid()
  );

-- 4. Grant SELECT on the public marketplace view to authenticated and anonymous users
-- This is intentional - marketplace browsing is public
GRANT SELECT ON public.marketplace_items_public TO anon;
GRANT SELECT ON public.marketplace_items_public TO authenticated;

-- 5. Grant SELECT on workspace_members_public ONLY to authenticated users
-- Anonymous users should NOT see any team member data
GRANT SELECT ON public.workspace_members_public TO authenticated;
REVOKE SELECT ON public.workspace_members_public FROM anon;

-- 6. Add explicit RLS policies on the base marketplace_items table 
-- to ensure it's properly protected when accessed directly
-- First, drop any overly permissive policies
DROP POLICY IF EXISTS "Anyone can view public marketplace items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Public marketplace items are viewable by anyone" ON public.marketplace_items;

-- Create restrictive policies for marketplace_items base table
-- Publishers can see ALL their own items (including non-public)
CREATE POLICY "Publishers can view their own items"
ON public.marketplace_items
FOR SELECT
USING (publisher_id = auth.uid());

-- Authenticated users can see public items through the base table too 
-- (though they should use the view which hides publisher info)
CREATE POLICY "Authenticated users can see public items"
ON public.marketplace_items
FOR SELECT
USING (is_public = true AND auth.uid() IS NOT NULL);

-- Publishers can manage their own items
DROP POLICY IF EXISTS "Publishers can update their own items" ON public.marketplace_items;
CREATE POLICY "Publishers can update their own items"
ON public.marketplace_items
FOR UPDATE
USING (publisher_id = auth.uid());

DROP POLICY IF EXISTS "Publishers can delete their own items" ON public.marketplace_items;
CREATE POLICY "Publishers can delete their own items"
ON public.marketplace_items
FOR DELETE
USING (publisher_id = auth.uid());

DROP POLICY IF EXISTS "Publishers can insert items" ON public.marketplace_items;
CREATE POLICY "Publishers can insert marketplace items"
ON public.marketplace_items
FOR INSERT
WITH CHECK (publisher_id = auth.uid());