DO $$ 
BEGIN
    -- We added this by mistake and it caused a duplicate foreign key (PGRST201)
    -- because material_order_items already had a foreign key to order_items.
    ALTER TABLE material_order_items 
    DROP CONSTRAINT IF EXISTS fk_material_order_items_order_item;
END $$;

NOTIFY pgrst, 'reload schema';
