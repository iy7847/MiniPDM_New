-- Create user_groups table
CREATE TABLE IF NOT EXISTS public.user_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for user_groups
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups in their company"
    ON public.user_groups FOR SELECT
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Company admins can insert groups"
    ON public.user_groups FOR INSERT
    WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')));

CREATE POLICY "Company admins can update groups"
    ON public.user_groups FOR UPDATE
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')));

CREATE POLICY "Company admins can delete groups"
    ON public.user_groups FOR DELETE
    USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')));

-- Alter profiles table to add new fields
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.user_groups(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS join_date DATE,
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS job_title TEXT;
