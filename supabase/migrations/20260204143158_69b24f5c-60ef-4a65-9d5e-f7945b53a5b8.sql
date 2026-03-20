-- =====================================================
-- SECURITY FIX: Restrict team_members SELECT policy
-- =====================================================

-- The current policy allows email matching which could expose team structures
-- New policy: Only workspace members can view team members in their workspaces

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view team members appropriately" ON public.team_members;

-- Create a more restrictive SELECT policy
-- Users can only see:
-- 1. Their own record (user_id = auth.uid())
-- 2. Team members in workspaces they belong to (via is_workspace_member)
CREATE POLICY "Members can view team members in their workspaces"
ON public.team_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_workspace_member(workspace_id)
);

-- Note: The email matching condition was removed because:
-- 1. It allowed information disclosure - any user could verify if an email is in a team
-- 2. Invited users who haven't accepted yet don't have user_id set, but they shouldn't 
--    need to see the full team structure before accepting
-- 3. is_workspace_member already handles the case of accepted members