-- ============================================================================
-- WP Content Autopilot — SaaS PostgreSQL / Supabase Migration
-- Version: 1.0.0
-- Includes: Multi-tenancy, RBAC (user & admin), User Settings, Keywords,
--           Prompt Studio, PayU India & USDT Crypto Billing, Pipeline Runs
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'agency', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'pending_approval', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_gateway AS ENUM ('payu', 'usdt_crypto', 'manual_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE keyword_status AS ENUM ('planned', 'in_progress', 'published', 'drafted', 'failed', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE publish_posture AS ENUM ('always_draft', 'auto_publish');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE ai_provider_type AS ENUM ('gemini', 'openai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. PROFILES TABLE (Linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'user',
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    subscription_status subscription_status NOT NULL DEFAULT 'active',
    monthly_quota INTEGER NOT NULL DEFAULT 3,
    used_this_month INTEGER NOT NULL DEFAULT 0,
    quota_resets_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON public.profiles(subscription_tier, subscription_status);

-- Helper function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. USER SETTINGS TABLE (WordPress & Automation Configuration)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    wp_base_url TEXT,
    wp_api_user TEXT,
    wp_app_password_encrypted TEXT,
    ai_provider ai_provider_type NOT NULL DEFAULT 'gemini',
    ai_api_key_encrypted TEXT,
    publish_posture publish_posture NOT NULL DEFAULT 'always_draft',
    daily_quota INTEGER NOT NULL DEFAULT 1,
    cron_schedule TEXT NOT NULL DEFAULT '0 6 * * *',
    cron_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    is_automation_enabled BOOLEAN NOT NULL DEFAULT false,
    last_run_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_automation ON public.user_settings(is_automation_enabled, user_id);

-- 5. KEYWORDS TABLE (Replacing keyword.csv)
CREATE TABLE IF NOT EXISTS public.keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    row_order INTEGER,
    keyword TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'BlogPost',
    blogpost_subtype TEXT,
    cluster TEXT DEFAULT '',
    class_hint TEXT DEFAULT 'B' CHECK (class_hint IN ('A', 'B', 'C')),
    priority INTEGER DEFAULT 1,
    status keyword_status NOT NULL DEFAULT 'planned',
    notes TEXT,
    suggested_tags TEXT,
    canonical_category TEXT,
    wp_post_id INTEGER,
    published_url TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keywords_user_status ON public.keywords(user_id, status, priority);

-- 6. PROMPT STUDIO (User Prompts & Global Presets)
CREATE TABLE IF NOT EXISTS public.user_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage_key TEXT NOT NULL CHECK (stage_key IN (
        'stage2_research',
        'stage3_draft',
        'stage3_final_edit',
        'stage_final_html',
        'stage4_image'
    )),
    system_prompt TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    is_customized BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, stage_key)
);

CREATE TABLE IF NOT EXISTS public.global_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    stage_key TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(template_name, stage_key)
);

-- Seed default global templates
INSERT INTO public.global_prompt_templates (template_name, stage_key, system_prompt, user_prompt, is_default)
VALUES
(
    'Default SEO Blog',
    'stage2_research',
    'You are an expert content researcher. Your job is to gather factual, citable information that a writer will use to produce a high-quality SEO article. You must NOT write the article — only gather and structure research.\n**Return ONLY a single JSON object. No markdown fences. No explanation.**\nSchema: { "outline_points": string[], "facts": [{ "claim": string, "source_url": string }], "definitions": string[], "tables": [{ "label": string, "rows": string[][] }], "quotes": [{ "text": string, "source": string, "source_url": string }], "unknowns": string[], "citations_required": boolean, "citations_present": boolean, "local_data_found": boolean, "research_confidence": "HIGH" | "MEDIUM" | "LOW" }',
    'Research the keyword "${keyword}" for a ${contentType} article.\nContext: ${JSON.stringify(contextPayload)}',
    true
),
(
    'Default SEO Blog',
    'stage3_draft',
    'You are a senior content writer. Write all article text in English.\nReturn ONLY valid, compact JSON matching the Stage3Output schema. No markdown fences, no prose outside JSON, no truncation.\nUse EXACT key names: title, content_markdown, excerpt, suggested_slug, category, tags, focus_keyword, additional_keywords, meta_title, meta_description, faq (array of {question, answer}), featured_image ({prompt, alt_text}), citations (array of {claim, source_url}), internal_links_plan, publish_recommendation, reasons, missing_data_fields.',
    'Write a ${contentType} article about "${keyword}".\nContext: ${JSON.stringify(contextPayload)}',
    true
),
(
    'Default SEO Blog',
    'stage3_final_edit',
    'You are a senior content editor. This is a PATCH-ONLY pass.\nPolish the draft article for publication quality:\n- Fix grammar and spelling.\n- Improve sentence flow and readability.\n- Ensure focus_keyword appears naturally in first 100 words.\n- Tighten verbose paragraphs. Each paragraph must be <= 120 words.\nIMMUTABILITY GUARD: Keep suggested_slug, category, tags, focus_keyword, citations, publish_recommendation verbatim.\nReturn ONLY valid compact JSON matching the Stage3Output schema.',
    'Polish this draft article (patch-only — preserve structure and all immutable fields):\n${JSON.stringify(draft)}',
    true
),
(
    'Default SEO Blog',
    'stage_final_html',
    'You are a senior HTML content composer. Transform a structured article JSON into clean, WordPress-safe HTML body content.\nOUTPUT RULES:\nReturn ONLY the HTML body string. No JSON. No markdown. No explanations. Start directly with the first HTML tag.\nAllowed tags ONLY: section, p, h2, h3, ul, ol, li, table, thead, tbody, tr, th, td, blockquote, strong, em, a, nav, div.\nFORBIDDEN: script, style, inline CSS, img, figure, iframe, embed.',
    'Convert this article JSON to WordPress-safe HTML body content.\nFocus keyword: ${focusKeyword}\nContent type: ${contentType}\nArticle JSON: ${JSON.stringify(userPayload)}',
    true
),
(
    'Default SEO Blog',
    'stage4_image',
    'You are a creative director. Write a detailed image generation prompt for a professional blog post thumbnail.\nReturn ONLY valid JSON:\n{\n  "prompt": string,\n  "negative_prompt": "blurry, low quality, distorted text, messy layout, watermark outside top-left, misspelled words",\n  "alt_text": string,\n  "style": "photorealistic" | "illustrative_flat"\n}',
    'Generate a professional thumbnail prompt for this article.\nTitle: "${title}"\nFocus keyword: "${keyword}"',
    true
)
ON CONFLICT (template_name, stage_key) DO NOTHING;

-- 7. BILLING & PAYMENT RECORDS (PayU India & USDT Crypto)
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    gateway payment_gateway NOT NULL,
    tier_requested subscription_tier NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR', -- 'INR' or 'USDT'
    status payment_status NOT NULL DEFAULT 'pending',
    
    -- PayU India details
    payu_txnid TEXT UNIQUE,
    payu_mihpayid TEXT,
    payu_bank_ref_num TEXT,
    payu_hash TEXT,
    
    -- USDT Crypto details
    crypto_network TEXT DEFAULT 'TRC20', -- 'TRC20', 'BEP20', 'ERC20'
    crypto_tx_hash TEXT UNIQUE,
    crypto_wallet_sent_from TEXT,
    crypto_receipt_url TEXT,
    admin_verification_notes TEXT,
    verified_by_admin UUID REFERENCES public.profiles(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payment_records(status);

-- 8. PIPELINE RUNS (Execution History)
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES public.keywords(id) ON DELETE SET NULL,
    keyword_text TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'cost_blocked')),
    wp_post_id INTEGER,
    wp_post_url TEXT,
    similarity_score REAL,
    model_trace JSONB,
    fail_reasons TEXT,
    duration_seconds INTEGER,
    cost_usd REAL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_user ON public.pipeline_runs(user_id, created_at DESC);

-- 9. AUTOMATIC USER CREATION TRIGGER (auth.users -> profiles + user_settings + user_prompts)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
    template_record RECORD;
    user_full_name TEXT;
    assigned_role public.user_role := 'user'::public.user_role;
BEGIN
    user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
    IF (new.raw_user_meta_data->>'role') = 'admin' THEN
        assigned_role := 'admin'::public.user_role;
    END IF;

    -- 1. Create Profile
    INSERT INTO public.profiles (id, email, full_name, role, subscription_tier, monthly_quota)
    VALUES (
        new.id,
        new.email,
        user_full_name,
        assigned_role,
        'free'::public.subscription_tier,
        3
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    -- 2. Create Default User Settings
    INSERT INTO public.user_settings (user_id, wp_base_url, wp_api_user, publish_posture, daily_quota)
    VALUES (new.id, '', '', 'always_draft'::public.publish_posture, 1)
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Seed Default Prompts from global default template
    INSERT INTO public.user_prompts (user_id, stage_key, system_prompt, user_prompt, is_customized)
    SELECT new.id, stage_key, system_prompt, user_prompt, false
    FROM public.global_prompt_templates
    WHERE is_default = true
    ON CONFLICT (user_id, stage_key) DO NOTHING;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user warning: %', SQLERRM;
    RETURN new;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Profiles: user reads/updates own, admin reads/updates all
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Settings
CREATE POLICY "user_settings_select" ON public.user_settings FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "user_settings_update" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "user_settings_insert" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Keywords
CREATE POLICY "keywords_all" ON public.keywords FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Prompts
CREATE POLICY "prompts_all" ON public.user_prompts FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Global Templates
CREATE POLICY "global_prompts_select" ON public.global_prompt_templates FOR SELECT USING (true);
CREATE POLICY "global_prompts_admin" ON public.global_prompt_templates FOR ALL USING (public.is_admin());

-- Payments
CREATE POLICY "payments_select" ON public.payment_records FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "payments_insert" ON public.payment_records FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "payments_admin_update" ON public.payment_records FOR UPDATE USING (public.is_admin());

-- Pipeline runs
CREATE POLICY "runs_select" ON public.pipeline_runs FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "runs_admin_all" ON public.pipeline_runs FOR ALL USING (public.is_admin());

