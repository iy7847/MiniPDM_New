-- Fix: treat material_supply_type = 'NONE' as 'ORDER' for INHOUSE items
CREATE OR REPLACE FUNCTION release_production_orders(p_item_ids UUID[])
RETURNS void AS $$
DECLARE
    v_company_id UUID;
    v_item RECORD;
    v_eff_material_supply_type VARCHAR;
BEGIN
    -- Get current user's company_id
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or no company associated';
    END IF;

    -- Loop through each item
    FOR v_item IN 
        SELECT oi.id, oi.supply_type, oi.material_supply_type, oi.production_status, oi.part_name, oi.material_name, oi.qty, oi.production_qty, oi.estimate_item_id, oi.order_id, oi.order_item_no, oi.use_stock
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.id = ANY(p_item_ids) AND o.company_id = v_company_id
    LOOP
        -- Only process items that are PENDING or NULL
        IF v_item.production_status IS NULL OR v_item.production_status = 'PENDING' THEN
            
            -- Determine effective material supply type
            v_eff_material_supply_type := v_item.material_supply_type;
            IF v_eff_material_supply_type IS NULL OR v_eff_material_supply_type = 'NONE' THEN
                IF v_item.use_stock = false AND (v_item.supply_type = 'INHOUSE' OR v_item.supply_type = 'OUTSOURCE') THEN
                    v_eff_material_supply_type := 'ORDER';
                END IF;
            END IF;

            -- Update order_items DB to reflect the effective choice if it changed
            IF (v_item.material_supply_type IS DISTINCT FROM v_eff_material_supply_type) THEN
                UPDATE order_items SET material_supply_type = v_eff_material_supply_type WHERE id = v_item.id;
            END IF;

            -- 1. Determine new status and handle Outsource/Purchase inserts
            IF v_item.supply_type = 'OUTSOURCE' THEN
                UPDATE order_items SET production_status = 'OUTSOURCE_READY' WHERE id = v_item.id;
                
                IF NOT EXISTS (SELECT 1 FROM outsource_orders WHERE order_item_id = v_item.id) THEN
                    INSERT INTO outsource_orders (
                        order_item_id, process_name, quantity, status, company_id
                    ) VALUES (
                        v_item.id, '외주가공(완제품)', COALESCE(v_item.production_qty, v_item.qty), '발주대기', v_company_id
                    );
                END IF;

            ELSIF v_item.supply_type = 'PURCHASE' THEN
                UPDATE order_items SET production_status = 'PURCHASE_READY' WHERE id = v_item.id;
                
                IF NOT EXISTS (SELECT 1 FROM outsource_orders WHERE order_item_id = v_item.id) THEN
                    INSERT INTO outsource_orders (
                        order_item_id, process_name, quantity, status, company_id
                    ) VALUES (
                        v_item.id, '기성품 구매', COALESCE(v_item.production_qty, v_item.qty), '발주대기', v_company_id
                    );
                END IF;

            ELSE -- 'INHOUSE' or others
                UPDATE order_items SET production_status = 'PRODUCTION_READY' WHERE id = v_item.id;
            END IF;

            -- 2. Handle Material Order (if material is required to be ordered)
            IF v_eff_material_supply_type = 'ORDER' THEN
                IF NOT EXISTS (SELECT 1 FROM material_orders WHERE order_item_id = v_item.id) THEN
                    INSERT INTO material_orders (
                        order_item_id, material_name, quantity, status, company_id, po_no
                    ) VALUES (
                        v_item.id, 
                        COALESCE(v_item.material_name, '원소재 발주 (' || v_item.part_name || ')'), 
                        COALESCE(v_item.production_qty, v_item.qty), 
                        '발주대기', 
                        v_company_id,
                        'M' || SUBSTRING(v_item.order_item_no FROM 2)
                    );
                END IF;
            END IF;

        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
