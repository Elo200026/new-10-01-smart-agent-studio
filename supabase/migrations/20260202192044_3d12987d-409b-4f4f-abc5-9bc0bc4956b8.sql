-- The issue is RLS policies accessing auth.users indirectly
-- We need to simplify the policies to avoid accessing restricted tables

-- First, let's drop and recreate knowledge_folders policies with simpler logic
DROP POLICY IF EXISTS "Users can view workspace folders" ON public.knowledge_folders;
DROP POLICY IF EXISTS "Users can create workspace folders" ON public.knowledge_folders;
DROP POLICY IF EXISTS "Users can update workspace folders" ON public.knowledge_folders;
DROP POLICY IF EXISTS "Users can delete workspace folders" ON public.knowledge_folders;

-- Simple SELECT policy: user owns workspace OR created folder themselves
CREATE POLICY "Users can view folders" 
ON public.knowledge_folders 
FOR SELECT 
USING (
  created_by = auth.uid() 
  OR workspace_id IS NULL
  OR workspace_id IN (
    SELECT id FROM workspaces WHERE created_by = auth.uid()
  )
);

-- Simple INSERT policy
CREATE POLICY "Users can create folders" 
ON public.knowledge_folders 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid()
);

-- Simple UPDATE policy
CREATE POLICY "Users can update folders" 
ON public.knowledge_folders 
FOR UPDATE 
USING (
  created_by = auth.uid() 
  OR workspace_id IN (
    SELECT id FROM workspaces WHERE created_by = auth.uid()
  )
);

-- Simple DELETE policy
CREATE POLICY "Users can delete folders" 
ON public.knowledge_folders 
FOR DELETE 
USING (
  created_by = auth.uid() 
  OR workspace_id IN (
    SELECT id FROM workspaces WHERE created_by = auth.uid()
  )
);