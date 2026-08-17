-- 1. Base33 채번 유틸리티 함수 생성 (부모: 수주번호용)
-- 1~999는 숫자 (001~999)
-- 1000~3299는 알파벳+숫자 (A00~Y99)
CREATE OR REPLACE FUNCTION public.int_to_base33_parent(v_num integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXY';
    v_char text;
    v_rem integer;
BEGIN
    IF v_num <= 0 THEN
        RETURN '001';
    END IF;
    
    IF v_num <= 999 THEN
        RETURN lpad(v_num::text, 3, '0');
    ELSE
        v_rem := v_num - 1000;
        IF v_rem >= 2300 THEN
            RAISE EXCEPTION 'Sequence exceeded max limit (3299) for this month.';
        END IF;
        
        v_char := substr(v_chars, (v_rem / 100) + 1, 1);
        RETURN v_char || lpad((v_rem % 100)::text, 2, '0');
    END IF;
END;
$$;

-- 2. Base33 채번 유틸리티 함수 생성 (자식: 품목번호용)
-- 1~99는 숫자 (01~99)
-- 100~329는 알파벳+숫자 (A0~Y9)
CREATE OR REPLACE FUNCTION public.int_to_base33_child(v_num integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXY';
    v_char text;
    v_rem integer;
BEGIN
    IF v_num <= 0 THEN
        RETURN '01';
    END IF;

    IF v_num <= 99 THEN
        RETURN lpad(v_num::text, 2, '0');
    ELSE
        v_rem := v_num - 100;
        IF v_rem >= 230 THEN
            RAISE EXCEPTION 'Sequence exceeded max limit (329) for this order.';
        END IF;
        
        v_char := substr(v_chars, (v_rem / 10) + 1, 1);
        RETURN v_char || (v_rem % 10)::text;
    END IF;
END;
$$;


-- 3. 수주 확정 RPC 수정 (convert_estimate_to_order)
-- po_no 및 order_item_no를 새 규칙에 맞게 채번하고 INSERT 하도록 수정
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
    v_total_amount NUMERIC := 0;
    
    v_child_seq INTEGER := 1;
    v_order_item_no VARCHAR(50);
BEGIN
    -- 1. 견적서 정보 조회
    SELECT client_id, currency, base_exchange_rate 
    INTO v_client_id, v_currency, v_exchange_rate
    FROM public.estimates
    WHERE id = p_estimate_id;

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Estimate not found';
    END IF;

    -- 선택된 품목들의 공급가 합계를 수주 총액으로 계산
    SELECT COALESCE(SUM(supply_price), 0) INTO v_total_amount
    FROM public.estimate_items
    WHERE estimate_id = p_estimate_id AND id = ANY(p_selected_item_ids);

    -- 2. 새 수주 번호(PO) 채번: P{YYMM}-{XXX}
    v_po_no := 'P' || TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || public.int_to_base33_parent(
        (SELECT COALESCE(COUNT(*), 0) + 1 FROM public.orders WHERE company_id = p_company_id AND TO_CHAR(created_at, 'YYMM') = TO_CHAR(CURRENT_DATE, 'YYMM'))::integer
    );

    -- 3. Orders 테이블에 INSERT (system order_number 컬럼도 po_no와 동일하게 업데이트)
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

        -- spec 결합 로직
        v_spec := concat_ws('x', 
            NULLIF(v_item.spec_w, 0)::text, 
            NULLIF(v_item.spec_d, 0)::text, 
            NULLIF(v_item.spec_h, 0)::text
        );
        
        -- 자식 품목 번호 채번: 부모번호-{YY}
        v_order_item_no := v_po_no || '-' || public.int_to_base33_child(v_child_seq);

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
            order_item_no,
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
            v_order_item_no,
            now(),
            now()
        ) RETURNING id INTO v_new_item_id;

        -- JSON 객체에 매핑 정보 누적
        v_mapping := v_mapping || jsonb_build_object(v_item.id::text, v_new_item_id::text);
        
        -- 견적 아이템의 상태 변경
        UPDATE public.estimate_items 
        SET order_status = 'ORDERED' 
        WHERE id = v_item.id;
        
        v_child_seq := v_child_seq + 1;
    END LOOP;

    -- 5. 견적서 상태 업데이트
    IF NOT EXISTS (
        SELECT 1 FROM public.estimate_items 
        WHERE estimate_id = p_estimate_id AND (order_status = 'PENDING' OR order_status IS NULL)
    ) THEN
        UPDATE public.estimates SET status = 'ORDERED' WHERE id = p_estimate_id;
    ELSE
        UPDATE public.estimates SET status = 'PARTIAL_ORDERED' WHERE id = p_estimate_id;
    END IF;

    RETURN jsonb_build_object(
        'order_id', v_new_order_id,
        'po_no', v_po_no,
        'item_mappings', v_mapping
    );
END;
$$;
