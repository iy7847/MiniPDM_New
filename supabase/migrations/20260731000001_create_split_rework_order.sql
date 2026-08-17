-- 불량 재작업용 파생 오더 분할 생성 RPC (Phase 4 MES)
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
    -- '원본품번-R' 로 시작하는 품번이 동일 order_id 내에 몇 개 있는지 카운트
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
        part_name, part_no, spec, material_name, qty, unit_price, supply_price,
        process_status, work_days, due_date, note, order_item_no, currency, exchange_rate,
        post_processing_name, production_type, production_note, production_status, supply_type, use_stock,
        original_material_name, material_id, client_po_no,
        updated_by, update_memo, created_at, updated_at
    ) VALUES (
        v_new_item_id, v_original_item.order_id, v_original_item.estimate_item_id, v_original_item.process_type, v_original_item.outsource_company,
        v_original_item.part_name, v_original_item.part_no, v_original_item.spec, v_original_item.material_name, p_defect_qty, v_original_item.unit_price, v_original_item.supply_price,
        'WAIT', v_original_item.work_days, v_original_item.due_date, p_defect_reason, v_new_item_no, v_original_item.currency, v_original_item.exchange_rate,
        v_original_item.post_processing_name, v_original_item.production_type, v_original_item.production_note, 'WAIT', v_original_item.supply_type, v_original_item.use_stock,
        v_original_item.original_material_name, v_original_item.material_id, v_original_item.client_po_no,
        NULL, 'Rework split from ' || v_original_item.order_item_no, now(), now()
    );

    -- 4. 원본 오더의 유효 생산 수량 차감 UPDATE
    UPDATE public.order_items
    SET qty = qty - p_defect_qty,
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
