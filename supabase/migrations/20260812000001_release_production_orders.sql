-- RPC to handle the release of production orders (생산 계획 확정 및 외주/구매 이관)
-- This replaces the multi-step frontend logic with a robust backend transaction.

CREATE OR REPLACE FUNCTION release_production_orders(p_item_ids UUID[])
RETURNS void AS $$
DECLARE
    v_company_id UUID;
    v_item RECORD;
BEGIN
    -- Get current user's company_id
    SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated or no company associated';
    END IF;

    -- Loop through each item
    FOR v_item IN 
        SELECT oi.id, oi.supply_type, oi.material_supply_type, oi.production_status, oi.part_name, oi.material_name, oi.qty, oi.production_qty, oi.estimate_item_id, oi.order_id
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.id = ANY(p_item_ids) AND o.company_id = v_company_id
    LOOP
        -- Only process items that are PENDING or NULL
        IF v_item.production_status IS NULL OR v_item.production_status = 'PENDING' THEN
            
            -- 1. Determine new status and handle Outsource/Purchase inserts
            IF v_item.supply_type = 'OUTSOURCE' THEN
                -- Update status
                UPDATE order_items SET production_status = 'OUTSOURCE_READY' WHERE id = v_item.id;
                
                -- Insert into outsource_orders if not exists
                IF NOT EXISTS (SELECT 1 FROM outsource_orders WHERE order_item_id = v_item.id) THEN
                    INSERT INTO outsource_orders (
                        order_item_id, process_name, quantity, status, company_id
                    ) VALUES (
                        v_item.id, '외주가공(완제품)', COALESCE(v_item.production_qty, v_item.qty), '발주대기', v_company_id
                    );
                END IF;

            ELSIF v_item.supply_type = 'PURCHASE' THEN
                -- Update status
                UPDATE order_items SET production_status = 'PURCHASE_READY' WHERE id = v_item.id;
                
                -- Insert into outsource_orders if not exists (treated as purchase outsource)
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
            IF v_item.material_supply_type = 'ORDER' THEN
                IF NOT EXISTS (SELECT 1 FROM material_orders WHERE order_item_id = v_item.id) THEN
                    -- Insert into material_orders and capture the new ID
                    WITH new_material_order AS (
                        INSERT INTO material_orders (
                            order_item_id, material_name, quantity, status, company_id
                        ) VALUES (
                            v_item.id, COALESCE(v_item.material_name, '원소재 발주 (' || v_item.part_name || ')'), COALESCE(v_item.production_qty, v_item.qty), '발주대기', v_company_id
                        ) RETURNING id
                    )
                    -- Insert into material_order_items to maintain the relationship
                    INSERT INTO material_order_items (
                        material_order_id, order_item_id, required_qty
                    )
                    SELECT id, v_item.id, COALESCE(v_item.production_qty, v_item.qty)
                    FROM new_material_order;
                END IF;
            END IF;

        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
