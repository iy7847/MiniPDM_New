-- Add po_no to material_orders

ALTER TABLE public.material_orders
ADD COLUMN IF NOT EXISTS po_no text;
