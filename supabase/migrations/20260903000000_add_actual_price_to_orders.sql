-- Add actual_unit_price and actual_total_price to outsource_orders and material_orders
ALTER TABLE public.outsource_orders ADD COLUMN IF NOT EXISTS actual_unit_price NUMERIC DEFAULT NULL;
ALTER TABLE public.outsource_orders ADD COLUMN IF NOT EXISTS actual_total_price NUMERIC DEFAULT NULL;

ALTER TABLE public.material_orders ADD COLUMN IF NOT EXISTS actual_unit_price NUMERIC DEFAULT NULL;
ALTER TABLE public.material_orders ADD COLUMN IF NOT EXISTS actual_total_price NUMERIC DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
