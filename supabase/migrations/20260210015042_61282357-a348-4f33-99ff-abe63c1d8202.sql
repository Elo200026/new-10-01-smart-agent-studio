
-- Step 1: Remove the broad public SELECT policies that expose publisher_id
DROP POLICY IF EXISTS "Public marketplace items are viewable by everyone" ON public.marketplace_items;
DROP POLICY IF EXISTS "Authenticated users can see public items" ON public.marketplace_items;

-- Step 2: Recreate the public view WITHOUT security_invoker so it can still read public items
DROP VIEW IF EXISTS public.marketplace_items_public;

CREATE VIEW public.marketplace_items_public AS
  SELECT id, name, description, item_type, config_data, canvas_data,
         agent_count, tags, category, download_count, rating, rating_count,
         created_at, updated_at, is_public
  FROM public.marketplace_items
  WHERE is_public = true;

-- Grant SELECT on the view to authenticated and anon roles
GRANT SELECT ON public.marketplace_items_public TO authenticated;
GRANT SELECT ON public.marketplace_items_public TO anon;
