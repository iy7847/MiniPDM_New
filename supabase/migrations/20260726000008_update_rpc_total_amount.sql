-- 기존 4개짜리 파라미터 함수 삭제 (오버로딩 충돌 방지)
DROP FUNCTION IF EXISTS public.convert_estimate_to_order(UUID, UUID, UUID, UUID[]);

-- 수주 전환 시 프론트엔드에서 계산된 정확한 수주 총액(p_total_amount)을 파라미터로 받도록 재생성
CREATE OR REPLACE FUNCTION public.convert_estimate_to_order(
    p_estimate_id UUID,
    p_company_id UUID,
    p_user_id UUID,
    p_selected_item_ids UUID[],
    p_total_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_order_id UUID;
    v_item RECORD;
    v_po_no VARCHAR(50);
    v_client_id UUID;
    v_new_item_id UUID;
    v_mapping JSONB := '{}'::jsonb;
    v_final_material_name VARCHAR(100);
    v_spec VARCHAR(255);
    v_currency VARCHAR(10);
    v_exchange_rate NUMERIC;
BEGIN
    SELECT client_id, currency, base_exchange_rate 
    INTO v_client_id, v_currency, v_exchange_rate
    FROM public.estimates
    WHERE id = p_estimate_id;

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Estimate not found';
    END IF;

    v_po_no := TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || LPAD(
        (SELECT COALESCE(COUNT(*), 0) + 1 FROM public.orders WHERE company_id = p_company_id AND TO_CHAR(created_at, 'YYMM') = TO_CHAR(CURRENT_DATE, 'YYMM'))::TEXT,
        3, '0'
    );

    INSERT INTO public.orders (
        company_id,
        client_id,
        estimate_id,
        po_no,
        order_date,
        delivery_date,
        status,
        currency,
        exchange_rate,
        total_amount,
        created_at,
        updated_at
    ) VALUES (
        p_company_id,
        v_client_id,
        p_estimate_id,
        v_po_no,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '14 days',
        'PENDING',
        COALESCE(v_currency, 'KRW'),
        COALESCE(v_exchange_rate, 1),
        COALESCE(p_total_amount, 0),
        now(),
        now()
    ) RETURNING id INTO v_new_order_id;

    FOR v_item IN 
        SELECT * FROM public.estimate_items 
        WHERE estimate_id = p_estimate_id AND id = ANY(p_selected_item_ids)
        ORDER BY array_position(p_selected_item_ids, id)
    LOOP
        v_final_material_name := v_item.original_material_name;
        IF v_item.material_id IS NOT NULL THEN
            SELECT name INTO v_final_material_name FROM public.materials WHERE id = v_item.material_id;
        END IF;

        v_spec := concat_ws('x', 
            NULLIF(v_item.spec_w, 0)::text, 
            NULLIF(v_item.spec_d, 0)::text, 
            NULLIF(v_item.spec_h, 0)::text
        );

        INSERT INTO public.order_items (
            order_id,
            estimate_item_id,
            part_name,
            part_no,
            spec,
            material_name,
            original_material_name,
            material_id,
            qty,
            unit_price,
            supply_price,
            note,
            production_status,
            created_at,
            updated_at
        ) VALUES (
            v_new_order_id,
            v_item.id,
            v_item.part_name,
            v_item.part_no,
            v_spec,
            v_final_material_name,
            v_item.original_material_name,
            v_item.material_id,
            v_item.qty,
            v_item.unit_price,
            v_item.supply_price,
            v_item.note,
            'PENDING',
            now(),
            now()
        ) RETURNING id INTO v_new_item_id;

        v_mapping := v_mapping || jsonb_build_object(v_item.id::text, v_new_item_id::text);
        
        UPDATE public.estimate_items 
        SET order_status = 'ORDERED' 
        WHERE id = v_item.id;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM public.estimate_items 
        WHERE estimate_id = p_estimate_id AND (order_status = 'PENDING' OR order_status IS NULL)
    ) THEN
        UPDATE public.estimates SET status = 'ORDERED' WHERE id = p_estimate_id;
    ELSE
        UPDATE public.estimates SET status = 'PARTIAL_ORDERED' WHERE id = p_estimate_id;
    END IF;

    -- 스키마 캐시 강제 새로고침
    NOTIFY pgrst, 'reload schema';

    RETURN jsonb_build_object(
        'order_id', v_new_order_id,
        'po_no', v_po_no,
        'item_mappings', v_mapping
    );
END;
$$;
