ALTER TABLE public.material_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage material_order_items for their company" ON public.material_order_items;

CREATE POLICY "Users can manage material_order_items for their company"
    ON public.material_order_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.material_orders mo
            WHERE mo.id = material_order_items.material_order_id
            AND mo.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
    );
