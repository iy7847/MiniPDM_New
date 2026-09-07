-- 사내/외주 공정 마스터 테이블
CREATE TABLE IF NOT EXISTS public.processes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_outsource boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 설정
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view processes of their company"
    ON public.processes FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid()
    ));

CREATE POLICY "Users can insert processes of their company"
    ON public.processes FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid()
    ));

CREATE POLICY "Users can update processes of their company"
    ON public.processes FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid()
    ));

CREATE POLICY "Users can delete processes of their company"
    ON public.processes FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE profiles.id = auth.uid()
    ));
