
-- Fix SECURITY DEFINER view issue
DROP VIEW IF EXISTS public.marketplace_items_public;

-- Add a SELECT policy on base table scoped to public items only
CREATE POLICY "Select public marketplace items"
ON public.marketplace_items FOR SELECT
USING (is_public = true);

CREATE VIEW public.marketplace_items_public
WITH (security_invoker = on) AS
  SELECT id, name, description, item_type,
         config_data, canvas_data, agent_count,
         tags, category, download_count,
         rating, rating_count, created_at,
         updated_at, is_public
  FROM public.marketplace_items
  WHERE is_public = true;

GRANT SELECT ON public.marketplace_items_public TO authenticated;
GRANT SELECT ON public.marketplace_items_public TO anon;
