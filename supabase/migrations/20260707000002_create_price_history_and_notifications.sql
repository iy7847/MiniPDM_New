-- notification_settings
CREATE TABLE public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    alert_days INTEGER[] DEFAULT '{1, 3, 7}',
    email_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- material_price_history
CREATE TABLE public.material_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    unit_price NUMERIC NOT NULL,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now(),
    changed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_price_history ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Strict company_id policy" ON public.notification_settings FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Strict company_id policy" ON public.material_price_history FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
