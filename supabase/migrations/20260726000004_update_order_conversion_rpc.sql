-- Migration: Update 0단계 수주 확정 로직 (Order Conversion RPC)
-- Description: convert_estimate_to_order 함수가 생성된 order_id, po_no, 그리고 파일 복사를 위한 estimate_item_id -> order_item_id 매핑 JSONB를 반환하도록 수정합니다.

DROP FUNCTION IF EXISTS public.convert_estimate_to_order(UUID, UUID, UUID, UUID[]);

CREATE OR REPLACE FUNCTION public.convert_estimate_to_order(
    p_estimate_id UUID,
    p_company_id UUID,
    p_user_id UUID,
    p_selected_item_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_estimate RECORD;
    v_new_order_id UUID;
    v_new_order_number TEXT;
    v_total_amount NUMERIC := 0;
    
    v_item RECORD;
    v_new_item_id UUID;
    v_item_mappings JSONB := '{}'::jsonb;
    v_final_material_name TEXT;
BEGIN
    -- 1. 원본 견적 데이터 조회
    SELECT * INTO v_estimate
    FROM public.estimates
    WHERE id = p_estimate_id AND company_id = p_company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Estimate not found';
    END IF;

    -- 2. 새 수주 번호 발급
    v_new_order_number := public.generate_order_number();

    -- 3. 선택된 아이템들의 총 금액 계산
    SELECT COALESCE(SUM(supply_price), 0) INTO v_total_amount
    FROM public.estimate_items
    WHERE estimate_id = p_estimate_id AND id = ANY(p_selected_item_ids);

    -- 4. Orders 테이블에 INSERT
    INSERT INTO public.orders (
        company_id,
        client_id,
        estimate_id,
        order_date,
        delivery_date,
        po_no,
        currency,
        exchange_rate,
        total_amount,
        status,
        order_number,
        created_at,
        updated_at
    ) VALUES (
        p_company_id,
        v_estimate.client_id,
        p_estimate_id,
        CURRENT_DATE,
        CURRENT_DATE + interval '14 days',
        v_estimate.project_name, 
        v_estimate.currency,
        v_estimate.base_exchange_rate,
        v_total_amount,
        'ORDERED',
        v_new_order_number,
        now(),
        now()
    ) RETURNING id INTO v_new_order_id;

    -- 5. Order Items 테이블에 LOOP INSERT 및 매핑 기록
    FOR v_item IN
        SELECT * FROM public.estimate_items
        WHERE estimate_id = p_estimate_id AND id = ANY(p_selected_item_ids)
    LOOP
        -- 자재명 결정 로직 (마스터 DB에 있으면 가져오고, 없으면 사용자가 입력한 값 사용)
        v_final_material_name := v_item.original_material_name;
        IF v_item.material_id IS NOT NULL THEN
            SELECT name INTO v_final_material_name FROM public.materials WHERE id = v_item.material_id;
        END IF;

        INSERT INTO public.order_items (
            order_id,
            part_name,
            part_no,
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
            v_item.part_name,
            v_item.part_no,
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

        -- JSON 객체에 매핑 정보 누적: "estimate_item_id": "order_item_id"
        v_item_mappings := v_item_mappings || jsonb_build_object(v_item.id::text, v_new_item_id::text);
    END LOOP;

    -- 6. 원본 견적 상태 업데이트
    UPDATE public.estimates
    SET status = 'ORDERED',
        updated_at = now()
    WHERE id = p_estimate_id;

    -- 7. 결과 JSON 반환
    RETURN jsonb_build_object(
        'order_id', v_new_order_id,
        'po_no', v_estimate.project_name,
        'order_number', v_new_order_number,
        'item_mappings', v_item_mappings
    );
END;
$$;
