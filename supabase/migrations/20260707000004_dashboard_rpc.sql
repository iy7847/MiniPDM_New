-- supabase/migrations/20260707000004_dashboard_rpc.sql

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_this_month_revenue NUMERIC;
  v_last_month_revenue NUMERIC;
  v_revenue_growth NUMERIC;
  v_active_orders INTEGER;
  v_pending_estimates INTEGER;
  v_estimates_this_month INTEGER;
  v_orders_this_month INTEGER;
  v_estimate_conversion_rate NUMERIC;
  v_monthly_revenue JSON;
  v_urgent_orders JSON;
BEGIN
  -- Get user's company_id
  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();

  IF v_company_id IS NULL THEN
    RETURN '{}'::JSON;
  END IF;

  -- This month revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO v_this_month_revenue
  FROM orders
  WHERE company_id = v_company_id
    AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE);

  -- Last month revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO v_last_month_revenue
  FROM orders
  WHERE company_id = v_company_id
    AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month');

  -- Revenue growth
  IF v_last_month_revenue > 0 THEN
    v_revenue_growth := ROUND(((v_this_month_revenue - v_last_month_revenue) / v_last_month_revenue * 100)::NUMERIC, 1);
  ELSE
    v_revenue_growth := 0;
  END IF;

  -- Active orders
  SELECT COUNT(*) INTO v_active_orders
  FROM orders
  WHERE company_id = v_company_id
    AND status NOT IN ('COMPLETED', 'CANCELLED', 'DONE');

  -- Pending estimates
  SELECT COUNT(*) INTO v_pending_estimates
  FROM estimates
  WHERE company_id = v_company_id
    AND status IN ('DRAFT', 'SENT');

  -- Estimate conversion rate (ordered this month / estimated this month)
  SELECT COUNT(*) INTO v_estimates_this_month
  FROM estimates
  WHERE company_id = v_company_id
    AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE);

  SELECT COUNT(*) INTO v_orders_this_month
  FROM estimates
  WHERE company_id = v_company_id
    AND status = 'ORDERED'
    AND date_trunc('month', updated_at) = date_trunc('month', CURRENT_DATE);
    
  IF v_estimates_this_month > 0 THEN
    v_estimate_conversion_rate := ROUND((v_orders_this_month::NUMERIC / v_estimates_this_month::NUMERIC * 100), 1);
  ELSE
    v_estimate_conversion_rate := 0;
  END IF;

  -- Monthly revenue (last 12 months)
  SELECT json_agg(row_to_json(t)) INTO v_monthly_revenue
  FROM (
    SELECT 
      to_char(month_series, 'FMMM월') as name,
      COALESCE(SUM(o.total_amount), 0) as "매출"
    FROM generate_series(
      date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
      date_trunc('month', CURRENT_DATE),
      '1 month'::interval
    ) as month_series
    LEFT JOIN orders o ON o.company_id = v_company_id 
      AND date_trunc('month', o.created_at) = month_series
    GROUP BY month_series
    ORDER BY month_series
  ) t;

  -- Urgent orders (Top 5)
  SELECT COALESCE(json_agg(row_to_json(uo)), '[]'::JSON) INTO v_urgent_orders
  FROM (
    SELECT 
      o.id,
      c.name as client,
      COALESCE(o.po_no, '주문 ' || SUBSTRING(o.id::text, 1, 8)) as item,
      (o.delivery_date::DATE - CURRENT_DATE) as "dDay",
      o.status
    FROM orders o
    LEFT JOIN clients c ON o.client_id = c.id
    WHERE o.company_id = v_company_id
      AND o.status NOT IN ('COMPLETED', 'CANCELLED', 'DONE')
      AND o.delivery_date IS NOT NULL
    ORDER BY o.delivery_date ASC
    LIMIT 5
  ) uo;

  RETURN json_build_object(
    'monthly_revenue', COALESCE(v_monthly_revenue, '[]'::JSON),
    'this_month_revenue', v_this_month_revenue,
    'revenue_growth', v_revenue_growth,
    'active_orders', v_active_orders,
    'pending_estimates', v_pending_estimates,
    'estimate_conversion_rate', v_estimate_conversion_rate,
    'urgent_orders', COALESCE(v_urgent_orders, '[]'::JSON)
  );
END;
$$;
