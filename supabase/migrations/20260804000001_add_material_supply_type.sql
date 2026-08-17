-- Add material_supply_type column to order_items for 3-attribute supply logic
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS material_supply_type TEXT DEFAULT 'NONE';

-- Add a comment to the column for documentation
COMMENT ON COLUMN public.order_items.material_supply_type IS '소재 조달 방식 (ORDER, STOCK, PROVIDED, NONE)';
