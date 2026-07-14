-- Add calculated_price to estimate_items to separate auto-calculated theoretical cost from manual unit_price
ALTER TABLE public.estimate_items ADD COLUMN calculated_price NUMERIC NULL;
