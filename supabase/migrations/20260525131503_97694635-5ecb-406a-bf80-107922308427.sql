CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  brand text,
  model text,
  category text,
  supplier_name text,
  supplier_contact text,
  supplier_phone text,
  product_link text,
  quantity numeric NOT NULL DEFAULT 1,
  quoted_price numeric NOT NULL DEFAULT 0,
  delivery_time text,
  payment_terms text,
  notes text,
  status text NOT NULL DEFAULT 'pendente',
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read quotes" ON public.quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update quotes" ON public.quotes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete quotes" ON public.quotes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.system_modules (key, label, icon, sort_order) VALUES ('cotacoes', 'Cotações', 'FileText', 35) ON CONFLICT DO NOTHING;