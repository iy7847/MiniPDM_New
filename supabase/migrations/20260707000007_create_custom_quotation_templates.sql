CREATE TABLE public.custom_quotation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    layout_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화
ALTER TABLE public.custom_quotation_templates ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (해당 회사 직원만 접근 가능)
CREATE POLICY "Users can view their company's custom templates"
    ON public.custom_quotation_templates FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their company's custom templates"
    ON public.custom_quotation_templates FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company's custom templates"
    ON public.custom_quotation_templates FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their company's custom templates"
    ON public.custom_quotation_templates FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- updated_at 트리거 연결
CREATE TRIGGER handle_updated_at_custom_quotation_templates
    BEFORE UPDATE ON public.custom_quotation_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
