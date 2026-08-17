DO $$ 
BEGIN
    -- Add foreign key to material_orders
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_material_order_items_material_order') THEN
        ALTER TABLE material_order_items 
        ADD CONSTRAINT fk_material_order_items_material_order FOREIGN KEY (material_order_id) REFERENCES material_orders(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key to order_items
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_material_order_items_order_item') THEN
        ALTER TABLE material_order_items 
        ADD CONSTRAINT fk_material_order_items_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Supabase PostgREST 스키마 캐시 새로고침 (매우 중요: 이거 없으면 캐시 갱신 안돼서 같은 에러 뜸)
NOTIFY pgrst, 'reload schema';
