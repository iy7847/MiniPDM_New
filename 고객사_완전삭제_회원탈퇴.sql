-- ==============================================================================
-- [MiniPDM v2.0] 고객사 완전 삭제 (회원 탈퇴 / 계정 및 데이터 전체 영구 삭제)
-- ==============================================================================
-- ⚠️ 주의사항:
-- 1. 이 스크립트는 지정한 고객사의 '회사 정보', '로그인 계정', '라이선스' 및
--    '모든 업무 데이터(견적/수주/생산/발주/출하/거래처 등)'를 영구적으로 삭제합니다.
-- 2. 삭제된 데이터는 복구할 수 없으므로 실행 전 반드시 확인하십시오.
-- 3. 본사(KEP) 계정은 시스템 보호를 위해 삭제되지 않도록 방어 로직이 적용되어 있습니다.
-- 4. Supabase 대시보드의 [SQL Editor]에 복사하여 붙여넣은 뒤 실행하세요.
-- ==============================================================================

DO $$
DECLARE
    -- ==========================================================================
    -- ⚙️ [설정] 삭제할 대상 회사를 지정하세요 (방법 1 또는 방법 2 중 하나 사용)
    -- ==========================================================================
    
    -- [방법 1] 회사 ID(UUID)를 직접 입력할 경우 (아래 따옴표 안에 UUID 입력)
    v_target_company_id UUID := NULL; 
    
    -- [방법 2] 회사명과 사업자번호로 찾을 경우 (방법 1이 NULL일 때 작동)
    -- 예: 회사명이 '유림'이고 사업자번호가 없는 경우 -> v_company_name := '유림'; v_biz_num := NULL;
    v_company_name TEXT := '유림'; 
    v_biz_num      TEXT := NULL;    -- 사업자번호가 등록되어 있다면 '469-88-00755' 형태로 입력 (없으면 NULL)

    -- 내부 처리용 변수
    v_comp RECORD;
    v_user_ids UUID[];
    v_cnt_shipment INT := 0;
    v_cnt_process INT := 0;
    v_cnt_orders INT := 0;
    v_cnt_estimates INT := 0;
    v_cnt_materials INT := 0;
    v_cnt_clients INT := 0;
    v_cnt_users INT := 0;
BEGIN
    -- 1. 대상 회사 찾기
    IF v_target_company_id IS NOT NULL THEN
        SELECT * INTO v_comp FROM public.companies WHERE id = v_target_company_id;
    ELSE
        IF v_biz_num IS NOT NULL THEN
            SELECT * INTO v_comp FROM public.companies 
            WHERE name = v_company_name AND biz_num = v_biz_num LIMIT 1;
        ELSE
            SELECT * INTO v_comp FROM public.companies 
            WHERE name = v_company_name AND (biz_num IS NULL OR biz_num = '') LIMIT 1;
        END IF;
    END IF;

    -- 검증
    IF v_comp.id IS NULL THEN
        RAISE EXCEPTION '❌ 삭제할 대상을 찾을 수 없습니다. (입력한 ID 또는 회사명/사업자번호를 확인하세요)';
    END IF;

    -- 본사 보호 가드
    IF v_comp.is_master_vendor = true THEN
        RAISE EXCEPTION '🛑 [보호 조치] 본사(KEP 마스터) 계정은 완전 삭제할 수 없습니다!';
    END IF;

    v_target_company_id := v_comp.id;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '🗑️ [고객사 완전 삭제 시작]';
    RAISE NOTICE '   - 회사명: %', v_comp.name;
    RAISE NOTICE '   - 회사 ID: %', v_target_company_id;
    RAISE NOTICE '   - 사업자번호: %', COALESCE(v_comp.biz_num, '(미등록)');
    RAISE NOTICE '   - 대표자: %', COALESCE(v_comp.ceo_name, '(미등록)');
    RAISE NOTICE '=======================================================';

    -- 소속 사용자 UUID 목록 확보 (나중에 Auth 계정 안내용)
    SELECT ARRAY_AGG(id) INTO v_user_ids FROM public.profiles WHERE company_id = v_target_company_id;

    -- [1] 출하 관련 데이터 삭제
    DELETE FROM public.shipment_items WHERE company_id = v_target_company_id;
    DELETE FROM public.shipments WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_shipment = ROW_COUNT;
    RAISE NOTICE '✔ 출하 데이터 삭제 완료 (%건)', v_cnt_shipment;

    -- [2] 생산 및 공정 로그 삭제
    DELETE FROM public.process_logs WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_process = ROW_COUNT;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'routing_template_items') THEN
        EXECUTE 'DELETE FROM public.routing_template_items WHERE template_id IN (SELECT id FROM public.routing_templates WHERE company_id = $1)' USING v_target_company_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'routing_templates') THEN
        EXECUTE 'DELETE FROM public.routing_templates WHERE company_id = $1' USING v_target_company_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'processes') THEN
        EXECUTE 'DELETE FROM public.processes WHERE company_id = $1' USING v_target_company_id;
    END IF;
    RAISE NOTICE '✔ 공정 실적 및 라우팅 설정 삭제 완료 (%건)', v_cnt_process;

    -- [3] 발주 데이터 삭제 (외주발주, 소재발주)
    -- ※ material_order_items는 이전 버전에서 제거되었으므로 존재할 때만 동적 삭제
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_order_items') THEN
        EXECUTE 'DELETE FROM public.material_order_items WHERE material_order_id IN (SELECT id FROM public.material_orders WHERE company_id = $1)' USING v_target_company_id;
    END IF;
    DELETE FROM public.material_orders WHERE company_id = v_target_company_id;
    DELETE FROM public.outsource_orders WHERE company_id = v_target_company_id;
    RAISE NOTICE '✔ 외주 및 소재 발주 내역 삭제 완료';

    -- [4] 수주 및 도면 파일 삭제
    DELETE FROM public.files WHERE order_item_id IN (
        SELECT oi.id FROM public.order_items oi
        JOIN public.orders o ON oi.order_id = o.id
        WHERE o.company_id = v_target_company_id
    );
    DELETE FROM public.order_items WHERE order_id IN (
        SELECT id FROM public.orders WHERE company_id = v_target_company_id
    );
    DELETE FROM public.orders WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_orders = ROW_COUNT;
    RAISE NOTICE '✔ 수주 내역 및 첨부 도면 삭제 완료 (%건)', v_cnt_orders;

    -- [5] 견적 및 견적 도면 삭제
    DELETE FROM public.files WHERE estimate_item_id IN (
        SELECT ei.id FROM public.estimate_items ei
        JOIN public.estimates e ON ei.estimate_id = e.id
        WHERE e.company_id = v_target_company_id
    );
    DELETE FROM public.estimate_items WHERE estimate_id IN (
        SELECT id FROM public.estimates WHERE company_id = v_target_company_id
    );
    DELETE FROM public.estimates WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_estimates = ROW_COUNT;
    RAISE NOTICE '✔ 견적 내역 및 품목 데이터 삭제 완료 (%건)', v_cnt_estimates;

    -- [6] 기준정보/단가/재고/거래처 삭제
    DELETE FROM public.custom_quotation_templates WHERE company_id = v_target_company_id;
    DELETE FROM public.excel_export_presets WHERE company_id = v_target_company_id;
    DELETE FROM public.heat_treatments WHERE company_id = v_target_company_id;
    DELETE FROM public.post_processings WHERE company_id = v_target_company_id;
    DELETE FROM public.inventory_transactions WHERE company_id = v_target_company_id;
    DELETE FROM public.inventories WHERE company_id = v_target_company_id;
    DELETE FROM public.material_price_history WHERE company_id = v_target_company_id;
    DELETE FROM public.item_suppliers WHERE company_id = v_target_company_id;
    DELETE FROM public.materials WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_materials = ROW_COUNT;
    
    DELETE FROM public.clients WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_clients = ROW_COUNT;
    RAISE NOTICE '✔ 단가/자재(%건) 및 거래처(%건) 기준정보 삭제 완료', v_cnt_materials, v_cnt_clients;

    -- [7] 알림/초대/권한그룹/사용자 프로필 삭제
    DELETE FROM public.invitations WHERE company_id = v_target_company_id;
    DELETE FROM public.notification_settings WHERE company_id = v_target_company_id;
    DELETE FROM public.user_groups WHERE company_id = v_target_company_id;
    DELETE FROM public.profiles WHERE company_id = v_target_company_id;
    GET DIAGNOSTICS v_cnt_users = ROW_COUNT;
    RAISE NOTICE '✔ 소속 사용자 프로필 및 초대 목록 삭제 완료 (%명)', v_cnt_users;

    -- [8] 고객사(회사) 본체 영구 삭제
    DELETE FROM public.companies WHERE id = v_target_company_id;
    RAISE NOTICE '✔ [최종] 고객사(%) 레코드 영구 삭제 완료!', v_comp.name;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE '🎉 [%] 고객사의 모든 데이터가 완전히 삭제되었습니다.', v_comp.name;
    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        RAISE NOTICE 'ℹ️ [안내] 로그인 계정(Auth) 완전 삭제:';
        RAISE NOTICE '   Supabase 대시보드 [Authentication] > [Users] 메뉴에서';
        RAISE NOTICE '   해당 이메일 계정을 삭제하시면 로그인 인증 정보까지 완전히 제거됩니다.';
    END IF;
    RAISE NOTICE '=======================================================';

END $$;
