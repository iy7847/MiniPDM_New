-- material_orders
CREATE TABLE public.material_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    spec TEXT,
    quantity INTEGER DEFAULT 0,
    weight NUMERIC DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    supplier_id UUID REFERENCES public.clients(id),
    supplier_name TEXT,
    order_date DATE,
    expected_date DATE,
    received_date DATE,
    status TEXT DEFAULT '발주대기',
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- inventories
CREATE TABLE public.inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_name TEXT NOT NULL,
    spec TEXT,
    quantity INTEGER DEFAULT 0,
    weight NUMERIC DEFAULT 0,
    location TEXT,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- process_logs
CREATE TABLE public.process_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    process_name TEXT NOT NULL,
    process_type TEXT NOT NULL,
    status TEXT DEFAULT '대기',
    worker TEXT,
    machine TEXT,
    outsource_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    notes TEXT,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- outsource_orders
CREATE TABLE public.outsource_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    process_id UUID REFERENCES public.process_logs(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.clients(id),
    supplier_name TEXT,
    process_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    unit_price NUMERIC DEFAULT 0,
    total_price NUMERIC DEFAULT 0,
    order_date DATE,
    expected_date DATE,
    received_date DATE,
    status TEXT DEFAULT '발주대기',
    notes TEXT,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- foreign key for outsource_id in process_logs mapping to outsource_orders
ALTER TABLE public.process_logs 
  ADD CONSTRAINT fk_process_logs_outsource 
  FOREIGN KEY (outsource_id) REFERENCES public.outsource_orders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.material_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outsource_orders ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Strict company_id policy" ON public.material_orders FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Strict company_id policy" ON public.inventories FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Strict company_id policy" ON public.process_logs FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Strict company_id policy" ON public.outsource_orders FOR ALL TO authenticated USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
