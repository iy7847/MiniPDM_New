-- outsource_orders 테이블에 outsource_type 필드 추가
-- 'NORMAL': 기존 정식 발주
-- 'INTERMEDIATE': 현장 작업자가 자동 발주한 중간 외주 (정산용)

ALTER TABLE public.outsource_orders
ADD COLUMN outsource_type character varying(20) DEFAULT 'NORMAL'::character varying NOT NULL;

-- 기존 데이터도 NORMAL로 셋팅됨.
