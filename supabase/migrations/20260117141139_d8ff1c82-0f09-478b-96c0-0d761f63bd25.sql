-- =========================================================================
-- SECURITY FIX: Team Members Email Protection & Agent Memory Workspace Isolation
-- =========================================================================

-- 1. FIX: Team Members Email Exposure
-- Drop existing policy that exposes emails to all workspace members
DROP POLICY IF EXISTS "Members can view accepted team members in their workspaces" ON public.team_members;

-- Create more restrictive policy: only admins and the user themselves can see full records
CREATE POLICY "Members can view team members appropriately"
ON public.team_members FOR SELECT
USING (
  user_id = auth.uid() OR  -- User can always see their own record
  email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR  -- User can see their own invited record
  is_workspace_admin(workspace_id)  -- Only admins can see all team members
);

-- Create a public view for non-admin workspace members with masked emails
CREATE OR REPLACE VIEW public.workspace_members_public AS
SELECT 
  tm.id,
  tm.workspace_id,
  tm.user_id,
  tm.role,
  tm.accepted_at,
  tm.invited_at,
  -- Mask email: show first 2 chars + *** + domain for regular members
  CASE 
    WHEN tm.user_id = auth.uid() THEN tm.email  -- Show own email
    WHEN EXISTS (
      SELECT 1 FROM workspaces w WHERE w.id = tm.workspace_id AND w.created_by = auth.uid()
    ) THEN tm.email  -- Workspace owners see full email
    WHEN EXISTS (
      SELECT 1 FROM team_members admin_tm 
      WHERE admin_tm.workspace_id = tm.workspace_id 
      AND admin_tm.user_id = auth.uid() 
      AND admin_tm.role = 'owner' 
      AND admin_tm.accepted_at IS NOT NULL
    ) THEN tm.email  -- Admins see full email
    ELSE 
      LEFT(tm.email, 2) || '***@' || SPLIT_PART(tm.email, '@', 2)  -- Mask for others
  END as email,
  tm.invited_by
FROM public.team_members tm
WHERE tm.accepted_at IS NOT NULL  -- Only show accepted members to regular users
AND (
  tm.user_id = auth.uid() OR
  is_workspace_member(tm.workspace_id)
);

-- Grant access to the view
GRANT SELECT ON public.workspace_members_public TO authenticated;

-- 2. FIX: Agent Memory Workspace Isolation
-- Drop existing policies that don't check workspace boundaries
DROP POLICY IF EXISTS "Users can manage their own memory" ON public.agent_memory;
DROP POLICY IF EXISTS "Users can view their own memory" ON public.agent_memory;

-- Create new workspace-aware policies
CREATE POLICY "Users can manage memory in accessible workspaces"
ON public.agent_memory FOR ALL
USING (
  user_id = auth.uid() AND (
    workspace_id IS NULL OR  -- Allow null workspace (user-level memory)
    is_workspace_member(workspace_id)  -- Check workspace membership
  )
)
WITH CHECK (
  user_id = auth.uid() AND (
    workspace_id IS NULL OR
    is_workspace_member(workspace_id)
  )
);

-- 3. IMPROVEMENT: Add audit logging for API key access
CREATE TABLE IF NOT EXISTS public.api_key_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.workspace_api_keys(id) ON DELETE CASCADE,
  accessed_by UUID NOT NULL,
  access_type TEXT NOT NULL,  -- 'view', 'create', 'update', 'delete'
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on access logs
ALTER TABLE public.api_key_access_logs ENABLE ROW LEVEL SECURITY;

-- Only workspace admins can view access logs
CREATE POLICY "Workspace admins can view API key access logs"
ON public.api_key_access_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_api_keys wak
    WHERE wak.id = api_key_id
    AND is_workspace_admin(wak.workspace_id)
  )
);

-- System can insert logs
CREATE POLICY "System can insert access logs"
ON public.api_key_access_logs FOR INSERT
WITH CHECK (accessed_by = auth.uid());