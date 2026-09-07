-- Drop the deprecated material_order_items table
-- This table was causing ambiguous foreign key errors (406 Not Acceptable) in Supabase PostgREST 
-- when joining material_orders and order_items.

DROP TABLE IF EXISTS public.material_order_items CASCADE;
