-- ==============================================================================
-- Migration: 20260707000006_analytics_rpc.sql
-- Description: RPC functions for dashboard analytics and statistics
-- ==============================================================================

-- 1. 월별 매출 통계 반환 함수
CREATE OR REPLACE FUNCTION get_monthly_revenue()
RETURNS TABLE (
    month_val text,
    total_revenue numeric,
    total_cost numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS month_val,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COALESCE(SUM(total_amount * 0.7), 0) AS total_cost -- 예시로 원가를 매출의 70%로 가정
    FROM 
        orders
    WHERE 
        created_at >= date_trunc('year', CURRENT_DATE)
    GROUP BY 
        date_trunc('month', created_at)
    ORDER BY 
        month_val;
END;
$$;

-- 2. 현재 진행중인 주문 상태별 카운트
CREATE OR REPLACE FUNCTION get_order_status_stats()
RETURNS TABLE (
    status_val text,
    status_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        status,
        COUNT(*) AS status_count
    FROM 
        orders
    GROUP BY 
        status
    ORDER BY 
        status_count DESC;
END;
$$;

-- 3. 우수 거래처 실적 TOP 5 (올해 기준)
CREATE OR REPLACE FUNCTION get_top_clients_revenue()
RETURNS TABLE (
    client_id uuid,
    client_name text,
    total_orders bigint,
    total_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS client_id,
        c.name AS client_name,
        COUNT(o.id) AS total_orders,
        COALESCE(SUM(o.total_amount), 0) AS total_revenue
    FROM 
        clients c
    JOIN 
        orders o ON c.id = o.client_id
    WHERE 
        o.created_at >= date_trunc('year', CURRENT_DATE)
    GROUP BY 
        c.id, c.name
    ORDER BY 
        total_revenue DESC
    LIMIT 5;
END;
$$;
