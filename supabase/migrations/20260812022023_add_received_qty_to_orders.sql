-- Add received_qty to outsource_orders
ALTER TABLE public.outsource_orders
ADD COLUMN received_qty integer DEFAULT 0;

-- Add received_qty to material_orders
ALTER TABLE public.material_orders
ADD COLUMN received_qty integer DEFAULT 0;
