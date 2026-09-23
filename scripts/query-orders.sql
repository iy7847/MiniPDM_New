SELECT id, po_no, order_number, status, total_amount, created_at 
FROM public.orders 
WHERE company_id = '269355b0-7e60-40a5-84bd-acf30da807a6'
ORDER BY created_at DESC;
