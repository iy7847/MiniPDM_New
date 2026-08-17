-- Add read_at and po_receipt_token to outsource_orders and material_orders
ALTER TABLE public.outsource_orders 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS po_receipt_token UUID;

ALTER TABLE public.material_orders
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS po_receipt_token UUID;
