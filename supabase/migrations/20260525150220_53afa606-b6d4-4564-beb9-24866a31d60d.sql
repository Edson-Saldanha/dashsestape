CREATE TABLE public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  color text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_by_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read categories" ON public.product_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth insert categories" ON public.product_categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth update categories" ON public.product_categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin delete categories" ON public.product_categories
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.system_modules (key, label, icon, sort_order)
VALUES ('categorias_produtos', 'Categorias de Produtos', 'Tags', 35)
ON CONFLICT DO NOTHING;