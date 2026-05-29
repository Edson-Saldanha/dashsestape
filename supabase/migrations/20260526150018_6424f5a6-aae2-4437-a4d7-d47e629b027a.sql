
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  customer_name text,
  customer_cpf text,
  customer_phone text,
  customer_email text,
  address text,
  city text,
  state text,
  product text,
  service_order_id uuid,
  os_number integer,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  notes text,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read deliveries" ON public.deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert deliveries" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update deliveries" ON public.deliveries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete deliveries" ON public.deliveries FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER deliveries_touch_updated_at BEFORE UPDATE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
