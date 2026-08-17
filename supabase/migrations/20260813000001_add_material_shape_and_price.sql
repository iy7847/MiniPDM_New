-- Add shape and estimated_price to material_orders
ALTER TABLE material_orders ADD COLUMN IF NOT EXISTS shape text;
ALTER TABLE material_orders ADD COLUMN IF NOT EXISTS estimated_price numeric DEFAULT 0;

-- Update PostgREST schema cache
NOTIFY pgrst, 'reload schema';
