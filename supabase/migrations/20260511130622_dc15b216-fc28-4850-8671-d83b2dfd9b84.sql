
-- Enum para status do produto
CREATE TYPE public.product_status AS ENUM ('ativo', 'inativo', 'esgotado');

-- Enum para tipo de movimentação de estoque
CREATE TYPE public.stock_movement_type AS ENUM ('entrada', 'saida', 'ajuste');

-- Tabela de produtos
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  brand TEXT,
  model TEXT,
  description TEXT,
  status public.product_status NOT NULL DEFAULT 'ativo',
  stock_qty NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  last_purchase_date TIMESTAMPTZ,
  location TEXT,
  notes TEXT,
  created_by UUID,
  created_by_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER products_touch_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update products" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete products" ON public.products FOR DELETE TO authenticated USING (true);

-- Histórico de movimentações de estoque
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type public.stock_movement_type NOT NULL,
  quantity NUMERIC NOT NULL,
  previous_qty NUMERIC,
  new_qty NUMERIC,
  notes TEXT,
  user_id UUID,
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read stock_movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert stock_movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX idx_products_name ON public.products(name);
