-- Fix workspace creation and marketplace security issues

-- 1. Drop and recreate workspaces policies with proper permissions
DROP POLICY IF EXISTS "Users can view accessible workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete their workspaces" ON public.workspaces;

-- Allow users to view workspaces they own or are members of
CREATE POLICY "Users can view accessible workspaces" 
ON public.workspaces 
FOR SELECT 
USING (
  created_by = auth.uid() 
  OR id IN (
    SELECT workspace_id FROM public.team_members 
    WHERE user_id = auth.uid() AND workspace_id IS NOT NULL
  )
);

-- Allow authenticated users to create workspaces
CREATE POLICY "Users can create workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

-- Allow workspace owners to update
CREATE POLICY "Users can update their workspaces" 
ON public.workspaces 
FOR UPDATE 
USING (created_by = auth.uid());

-- Allow workspace owners to delete
CREATE POLICY "Users can delete their workspaces" 
ON public.workspaces 
FOR DELETE 
USING (created_by = auth.uid());

-- 2. Fix marketplace_items security - hide publisher details from public
DROP POLICY IF EXISTS "Anyone can view public marketplace items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Publishers can manage their items" ON public.marketplace_items;

-- Create a view that hides sensitive publisher info for public browsing
CREATE OR REPLACE VIEW public.marketplace_items_public
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
FROM public.marketplace_items
WHERE is_public = true;

-- Base table: only publishers can see their own items directly
CREATE POLICY "Publishers can view own items" 
ON public.marketplace_items 
FOR SELECT 
USING (publisher_id = auth.uid());

-- Publishers can insert their own items
CREATE POLICY "Publishers can create items" 
ON public.marketplace_items 
FOR INSERT 
WITH CHECK (publisher_id = auth.uid());

-- Publishers can update their own items
CREATE POLICY "Publishers can update items" 
ON public.marketplace_items 
FOR UPDATE 
USING (publisher_id = auth.uid());

-- Publishers can delete their own items
CREATE POLICY "Publishers can delete items" 
ON public.marketplace_items 
FOR DELETE 
USING (publisher_id = auth.uid());

-- Grant access to the public view for authenticated users
GRANT SELECT ON public.marketplace_items_public TO authenticated;
GRANT SELECT ON public.marketplace_items_public TO anon;