SELECT id, order_id, part_name, part_no, production_status 
FROM public.order_items 
WHERE order_id IN ('4f8b5257-9be8-49fd-94e9-044597b7036a', 'c0add03b-67fb-4c37-b7e7-42f432967904');
