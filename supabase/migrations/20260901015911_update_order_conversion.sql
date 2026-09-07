-- 1. order_items 테이블에 열처리 이름 컬럼 추가
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS heat_treatment_name text;

-- 2. 수주 확정 RPC 수정 (convert_estimate_to_order)
-- 후처리 이름(post_processing_name) 및 열처리 이름(heat_treatment_name)을 가져와 order_items에 저장합니다.

DROP FUNCTION IF EXISTS public.convert_estimate_to_order(UUID, UUID, UUID, UUID[]);

CREATE OR REPLACE FUNCTION public.convert_estimate_to_order(
    p_estimate_id UUID,
    p_company_id UUID,
    p_user_id UUID,
    p_selected_item_ids UUID[]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_id UUID;
    v_total_amount NUMERIC;
    v_currency TEXT;
    v_exchange_rate NUMERIC;
    v_new_order_id UUID;
    v_new_item_id UUID;
    v_item RECORD;
    v_po_no TEXT;
    v_final_material_name TEXT;
    v_final_post_processing_name TEXT;
    v_final_heat_treatment_name TEXT;
    v_child_seq INTEGER := 1;
    v_order_item_no TEXT;
    v_spec TEXT;
    v_material_spec TEXT;
    v_mappings JSONB := '{}'::JSONB;
BEGIN
    -- 1. 기본 정보 조회 (견적서, 통화, 환율)
    SELECT client_id, currency, exchange_rate INTO v_client_id, v_currency, v_exchange_rate
    FROM public.estimates 
    WHERE id = p_estimate_id;

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Estimate not found';
    END IF;

    -- 선택된 항목들만으로 total_amount 재계산
    SELECT COALESCE(SUM(supply_price), 0) INTO v_total_amount
    FROM public.estimate_items
    WHERE estimate_id = p_estimate_id AND id = ANY(p_selected_item_ids);

    -- 2. 새 수주 번호(PO) 채번: P{YYMM}-{XXX}
    v_po_no := 'P' || TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || public.int_to_base33_parent(
        (SELECT COALESCE(COUNT(*), 0) + 1 FROM public.orders WHERE company_id = p_company_id AND TO_CHAR(created_at, 'YYMM') = TO_CHAR(CURRENT_DATE, 'YYMM'))::integer
    );

    -- 3. Orders 테이블에 INSERT
    INSERT INTO public.orders (
        company_id,
        client_id,
        estimate_id,
        po_no,
        order_number, 
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
        v_po_no,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '14 days',
        'PENDING',
        COALESCE(v_currency, 'KRW'),
        COALESCE(v_exchange_rate, 1),
        v_total_amount,
        now(),
        now()
    ) RETURNING id INTO v_new_order_id;

    -- 4. 선택된 견적 품목들을 순회하며 OrderItems에 INSERT
    FOR v_item IN 
        SELECT * FROM public.estimate_items 
        WHERE estimate_id = p_estimate_id AND id = ANY(p_selected_item_ids)
        ORDER BY array_position(p_selected_item_ids, id)
    LOOP
        -- 재질 이름 결정 로직
        v_final_material_name := v_item.original_material_name;
        IF v_item.material_id IS NOT NULL THEN
            SELECT name INTO v_final_material_name FROM public.materials WHERE id = v_item.material_id;
        END IF;

        -- 후처리 이름 결정 로직
        v_final_post_processing_name := NULL;
        IF v_item.post_processing_id IS NOT NULL THEN
            SELECT name INTO v_final_post_processing_name FROM public.post_processings WHERE id = v_item.post_processing_id;
        END IF;

        -- 열처리 이름 결정 로직
        v_final_heat_treatment_name := NULL;
        IF v_item.heat_treatment_id IS NOT NULL THEN
            SELECT name INTO v_final_heat_treatment_name FROM public.heat_treatments WHERE id = v_item.heat_treatment_id;
        END IF;

        -- spec 결합 로직 (제품 치수)
        v_spec := concat_ws('x', 
            NULLIF(v_item.spec_w, 0)::text, 
            NULLIF(v_item.spec_d, 0)::text, 
            NULLIF(v_item.spec_h, 0)::text
        );

        -- material_spec 결합 로직 (소재 치수)
        v_material_spec := concat_ws('x', 
            NULLIF(v_item.raw_w, 0)::text, 
            NULLIF(v_item.raw_d, 0)::text, 
            NULLIF(v_item.raw_h, 0)::text
        );
        
        -- 자식 품목 번호 채번: 부모번호-{YY}
        v_order_item_no := v_po_no || '-' || public.int_to_base33_child(v_child_seq);

        INSERT INTO public.order_items (
            order_id,
            estimate_item_id,
            part_name,
            part_no,
            spec,
            material_spec,
            material_name,
            original_material_name,
            material_id,
            post_processing_name,
            heat_treatment_name,
            qty,
            production_qty,
            unit_price,
            supply_price,
            note,
            work_days,
            production_status,
            order_item_no,
            created_at,
            updated_at
        ) VALUES (
            v_new_order_id,
            v_item.id,
            v_item.part_name,
            v_item.part_no,
            v_spec,
            v_material_spec,
            v_final_material_name,
            v_item.original_material_name,
            v_item.material_id,
            v_final_post_processing_name,
            v_final_heat_treatment_name,
            v_item.qty,
            v_item.qty,
            v_item.unit_price,
            v_item.supply_price,
            v_item.note,
            v_item.work_days,
            'PENDING',
            v_order_item_no,
            now(),
            now()
        ) RETURNING id INTO v_new_item_id;

        -- JSON 객체에 매핑 정보 누적
        v_mappings := jsonb_set(v_mappings, ARRAY[v_item.id::text], to_jsonb(v_new_item_id));
        
        v_child_seq := v_child_seq + 1;
    END LOOP;

    -- 견적서 상태 업데이트 ('ORDERED')
    UPDATE public.estimates
    SET status = 'ORDERED', updated_at = now()
    WHERE id = p_estimate_id;

    RETURN jsonb_build_object(
        'order_id', v_new_order_id,
        'po_no', v_po_no,
        'mapping', v_mappings
    );
END;
$$;
