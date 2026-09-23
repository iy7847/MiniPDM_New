-- ==============================================================================
-- 1. clients 테이블 RLS 정책 수정 (마스터 관리자 예외 및 WITH CHECK 추가)
-- 2. convert_estimate_to_order RPC 예외 처리 및 안정성 강화
-- ==============================================================================

-- 1. clients 테이블 RLS 정책 갱신
DROP POLICY IF EXISTS "Strict company_id policy" ON public.clients;
DROP POLICY IF EXISTS "Master and company client policy" ON public.clients;

CREATE POLICY "Master and company client policy" ON public.clients
FOR ALL TO authenticated
USING (
  public.is_master_admin()
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  public.is_master_admin()
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- 2. convert_estimate_to_order RPC 함수 교체 (거래처 미지정 명확한 에러 및 채번 무결성 강화)
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
    v_estimate RECORD;
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
    v_seq_candidate INTEGER;
    v_loop_guard INTEGER := 0;
BEGIN
    -- 1. 견적서 기본 정보 조회
    SELECT * INTO v_estimate
    FROM public.estimates 
    WHERE id = p_estimate_id;

    IF v_estimate.id IS NULL THEN
        RAISE EXCEPTION '해당 견적서를 찾을 수 없습니다 (ID: %)', p_estimate_id;
    END IF;

    v_client_id := v_estimate.client_id;
    IF v_client_id IS NULL THEN
        RAISE EXCEPTION '거래처가 지정되지 않은 견적서는 수주로 전환할 수 없습니다. 견적서에서 거래처를 먼저 지정해주세요.';
    END IF;

    v_currency := COALESCE(v_estimate.currency, 'KRW');
    v_exchange_rate := COALESCE(v_estimate.exchange_rate, 1);

    -- 선택된 항목들만으로 total_amount 재계산
    SELECT COALESCE(SUM(supply_price), 0) INTO v_total_amount
    FROM public.estimate_items
    WHERE estimate_id = p_estimate_id AND id = ANY(p_selected_item_ids);

    -- 2. 새 수주 번호(PO) 채번: P{YYMM}-{XXX} (중복 충돌 자동 회피 루프)
    SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq_candidate
    FROM public.orders 
    WHERE company_id = p_company_id 
      AND TO_CHAR(created_at, 'YYMM') = TO_CHAR(CURRENT_DATE, 'YYMM');

    LOOP
        v_po_no := 'P' || TO_CHAR(CURRENT_DATE, 'YYMM') || '-' || public.int_to_base33_parent(v_seq_candidate);
        
        -- 중복 검사
        IF NOT EXISTS (SELECT 1 FROM public.orders WHERE company_id = p_company_id AND po_no = v_po_no) THEN
            EXIT;
        END IF;
        
        v_seq_candidate := v_seq_candidate + 1;
        v_loop_guard := v_loop_guard + 1;
        IF v_loop_guard > 1000 THEN
            RAISE EXCEPTION '수주 번호(PO) 자동 채번 한도를 초과했습니다.';
        END IF;
    END LOOP;

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
        v_currency,
        v_exchange_rate,
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
            COALESCE(v_item.part_name, ''),
            v_item.part_no,
            v_spec,
            v_material_spec,
            v_final_material_name,
            v_item.original_material_name,
            v_item.material_id,
            v_final_post_processing_name,
            v_final_heat_treatment_name,
            COALESCE(v_item.qty, 1),
            COALESCE(v_item.qty, 1),
            COALESCE(v_item.unit_price, 0),
            COALESCE(v_item.supply_price, 0),
            v_item.note,
            COALESCE(v_item.work_days, 3),
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

    -- PostgREST 스키마 캐시 리로드
    PERFORM pg_notify('pgrst', 'reload schema');

    RETURN jsonb_build_object(
        'order_id', v_new_order_id,
        'po_no', v_po_no,
        'mapping', v_mappings
    );
END;
$$;
