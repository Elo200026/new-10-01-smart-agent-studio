-- Fix workspaces RLS policy to allow team members to view workspaces they belong to
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.workspaces;

CREATE POLICY "Users can view accessible workspaces" 
ON public.workspaces 
FOR SELECT 
USING (
  auth.uid() = created_by 
  OR 
  id IN (
    SELECT workspace_id FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);