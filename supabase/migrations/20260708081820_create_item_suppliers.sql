CREATE TABLE IF NOT EXISTS public.item_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL,
    client_id UUID NOT NULL,
    unit_price NUMERIC,
    moq NUMERIC,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.item_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view item_suppliers of their company"
    ON public.item_suppliers FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert item_suppliers of their company"
    ON public.item_suppliers FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update item_suppliers of their company"
    ON public.item_suppliers FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ))
    WITH CHECK (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete item_suppliers of their company"
    ON public.item_suppliers FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE INDEX IF NOT EXISTS idx_item_suppliers_item_id ON public.item_suppliers(item_id);
CREATE INDEX IF NOT EXISTS idx_item_suppliers_company_id ON public.item_suppliers(company_id);
