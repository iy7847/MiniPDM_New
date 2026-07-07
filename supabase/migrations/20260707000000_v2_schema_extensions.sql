-- Add production_status and production_note to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'PENDING';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS production_note TEXT;

-- Add parent_estimate_id and version to estimates
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS parent_estimate_id UUID REFERENCES public.estimates(id);
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add alert_days_before_deadline and theme to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS alert_days_before_deadline INTEGER[] DEFAULT '{1,3,7}';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark';

-- Add outsource_cost and outsource_company to estimate_items
ALTER TABLE public.estimate_items ADD COLUMN IF NOT EXISTS outsource_cost NUMERIC DEFAULT 0;
ALTER TABLE public.estimate_items ADD COLUMN IF NOT EXISTS outsource_company TEXT;

-- Add client_type to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'CUSTOMER' CHECK (client_type IN ('CUSTOMER', 'SUPPLIER', 'BOTH'));

-- Strict RLS policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.companies;
CREATE POLICY "Strict company_id policy" ON public.companies FOR ALL TO authenticated USING (id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.estimates;
CREATE POLICY "Strict company_id policy" ON public.estimates FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.clients;
CREATE POLICY "Strict company_id policy" ON public.clients FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.estimate_items;
CREATE POLICY "Strict company_id policy" ON public.estimate_items FOR ALL TO authenticated USING (estimate_id IN (SELECT id FROM public.estimates WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.order_items;
CREATE POLICY "Strict company_id policy" ON public.order_items FOR ALL TO authenticated USING (order_id IN (SELECT id FROM public.orders WHERE company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())));
