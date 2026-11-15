-- ============================================================================
-- Fix Auth Trigger in Supabase
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bwimialwdgponzlqnxkq/sql/new
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
    template_record RECORD;
    user_full_name TEXT;
    assigned_role public.user_role := 'user'::public.user_role;
BEGIN
    -- Extract full name safely
    user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
    
    -- Check role safely
    IF (new.raw_user_meta_data->>'role') = 'admin' THEN
        assigned_role := 'admin'::public.user_role;
    END IF;

    -- 1. Insert Profile
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        subscription_tier, 
        subscription_status,
        monthly_quota,
        used_this_month
    )
    VALUES (
        new.id,
        new.email,
        user_full_name,
        assigned_role,
        'free'::public.subscription_tier,
        'active'::public.subscription_status,
        3,
        0
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    -- 2. Insert User Settings
    INSERT INTO public.user_settings (
        user_id, 
        wp_base_url, 
        wp_api_user, 
        publish_posture, 
        daily_quota
    )
    VALUES (
        new.id, 
        '', 
        '', 
        'always_draft'::public.publish_posture, 
        1
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Seed Default Prompts
    INSERT INTO public.user_prompts (
        user_id, 
        stage_key, 
        system_prompt, 
        user_prompt, 
        is_customized
    )
    SELECT 
        new.id, 
        stage_key, 
        system_prompt, 
        user_prompt, 
        false
    FROM public.global_prompt_templates
    WHERE is_default = true
    ON CONFLICT (user_id, stage_key) DO NOTHING;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user warning: %', SQLERRM;
    RETURN new;
END;
$$;

-- Re-create Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

