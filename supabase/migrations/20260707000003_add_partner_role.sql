-- 20260707000003_add_partner_role.sql

ALTER TABLE public.profiles ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Restrictive policy for 'partner' role on outsource_orders
-- Partners can only access rows where supplier_id matches their client_id.
CREATE POLICY "Partner restricted access" 
ON public.outsource_orders
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'partner'
  OR 
  supplier_id = (SELECT client_id FROM public.profiles WHERE id = auth.uid())
);
