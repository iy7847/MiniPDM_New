-- 1. Add production_qty column to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS production_qty INTEGER;
UPDATE public.order_items SET production_qty = qty WHERE production_qty IS NULL;
ALTER TABLE public.order_items ALTER COLUMN production_qty SET NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN production_qty SET DEFAULT 1;

-- 2. Update convert_estimate_to_order to insert production_qty
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
            production_qty,
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
            v_item.qty, -- production_qty 기본값은 수주 수량과 동일
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


-- 3. Update split_rework_order to handle production_qty
CREATE OR REPLACE FUNCTION public.split_rework_order(
    p_order_item_id uuid,
    p_defect_qty integer,
    p_defect_reason text,
    p_worker text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_original_item record;
    v_new_item_id uuid;
    v_new_item_no text;
    v_rework_count integer;
    v_company_id uuid;
BEGIN
    -- 1. 원본 수주 품목 조회
    SELECT * INTO v_original_item FROM public.order_items WHERE id = p_order_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Original order item not found.';
    END IF;

    IF v_original_item.qty <= p_defect_qty THEN
        RAISE EXCEPTION 'Defect quantity cannot be greater than or equal to original quantity. Please update the status of the original item instead.';
    END IF;

    -- 회사 ID 조회 (orders 테이블 조인)
    SELECT company_id INTO v_company_id FROM public.orders WHERE id = v_original_item.order_id;

    -- 2. 파생 오더의 Suffix(-R1, -R2...) 결정을 위한 기존 재작업 카운트 조회
    SELECT count(*)
    INTO v_rework_count
    FROM public.order_items
    WHERE order_id = v_original_item.order_id
      AND order_item_no LIKE (split_part(v_original_item.order_item_no, '-R', 1) || '-R%');

    -- 새로운 품번 생성 (예: ITM-001-R1)
    v_new_item_no := split_part(v_original_item.order_item_no, '-R', 1) || '-R' || (v_rework_count + 1);
    v_new_item_id := gen_random_uuid();

    -- 3. 새로운 파생 오더(Row) INSERT (불량 수량만큼 할당)
    INSERT INTO public.order_items (
        id, order_id, estimate_item_id, process_type, outsource_company,
        part_name, part_no, spec, material_name, qty, production_qty, unit_price, supply_price,
        process_status, work_days, due_date, note, order_item_no, currency, exchange_rate,
        post_processing_name, production_type, production_note, production_status, supply_type, use_stock,
        original_material_name, material_id, client_po_no,
        updated_by, update_memo, created_at, updated_at
    ) VALUES (
        v_new_item_id, v_original_item.order_id, v_original_item.estimate_item_id, v_original_item.process_type, v_original_item.outsource_company,
        v_original_item.part_name, v_original_item.part_no, v_original_item.spec, v_original_item.material_name, p_defect_qty, p_defect_qty, v_original_item.unit_price, v_original_item.supply_price,
        'WAIT', v_original_item.work_days, v_original_item.due_date, p_defect_reason, v_new_item_no, v_original_item.currency, v_original_item.exchange_rate,
        v_original_item.post_processing_name, v_original_item.production_type, v_original_item.production_note, 'WAIT', v_original_item.supply_type, v_original_item.use_stock,
        v_original_item.original_material_name, v_original_item.material_id, v_original_item.client_po_no,
        NULL, 'Rework split from ' || v_original_item.order_item_no, now(), now()
    );

    -- 4. 원본 오더의 유효 생산 수량 차감 UPDATE
    UPDATE public.order_items
    SET qty = qty - p_defect_qty,
        production_qty = GREATEST(0, production_qty - p_defect_qty),
        updated_at = now()
    WHERE id = p_order_item_id;

    -- 5. 불량 발생 이력을 원본 오더의 공정 로그(process_logs)에 기록
    INSERT INTO public.process_logs (
        order_item_id, process_name, status, worker, start_time, end_time, notes, company_id, created_at, updated_at
    ) VALUES (
        p_order_item_id, '품질검사/불량보고', '불량', p_worker, now(), now(), p_defect_reason, v_company_id, now(), now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_item_id', v_new_item_id,
        'new_item_no', v_new_item_no
    );
END;
$$;
