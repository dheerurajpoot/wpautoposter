-- ==============================================================================
-- Add Rich SEO & Editorial Metadata Columns to Supabase 'keywords' Table
-- ==============================================================================

ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS review_subtype TEXT;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS funnel_stage TEXT;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS local_modifier TEXT;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS phase INTEGER;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS planned_month INTEGER;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS planned_week TEXT;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS cannibalization_group TEXT;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS local_data_required TEXT;
ALTER TABLE public.keywords ADD COLUMN IF NOT EXISTS pass_risk TEXT;

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';

