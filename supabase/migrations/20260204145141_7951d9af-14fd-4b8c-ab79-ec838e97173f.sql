-- =====================================================
-- FIX: knowledge_chunks INSERT policy
-- =====================================================
-- The current policy fails for folders with NULL created_by
-- We need to allow inserts when the user has SELECT access to the folder

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Users can create workspace chunks" ON public.knowledge_chunks;

-- Create a fixed INSERT policy
-- Allow inserts when:
-- 1. folder_id is NULL (unfiled chunks), OR
-- 2. folder_id belongs to a workspace folder the user can access, OR
-- 3. folder_id belongs to a personal folder the user created, OR
-- 4. folder_id exists and has no workspace (legacy folders without created_by)
CREATE POLICY "Users can create chunks"
ON public.knowledge_chunks
FOR INSERT
TO authenticated
WITH CHECK (
  folder_id IS NULL
  OR folder_id IN (
    SELECT id FROM knowledge_folders
    WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE created_by = auth.uid()
      UNION
      SELECT workspace_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'editor')
    )
  )
  OR folder_id IN (
    SELECT id FROM knowledge_folders
    WHERE workspace_id IS NULL AND created_by = auth.uid()
  )
  OR folder_id IN (
    SELECT id FROM knowledge_folders
    WHERE workspace_id IS NULL AND created_by IS NULL
  )
);