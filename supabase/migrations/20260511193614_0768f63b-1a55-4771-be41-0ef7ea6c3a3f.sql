
-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cpf text NOT NULL UNIQUE,
  cpf_formatted text,
  phone text,
  email text,
  city text,
  state text,
  origin text,
  status text NOT NULL DEFAULT 'ativo',
  notes text,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_cpf ON public.customers(cpf);
CREATE INDEX idx_customers_created_at ON public.customers(created_at DESC);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update customers" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete customers" ON public.customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_customers_touch BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SYSTEM MODULES ============
CREATE TABLE public.system_modules (
  key text PRIMARY KEY,
  label text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read modules" ON public.system_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage modules" ON public.system_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.system_modules(key, label, icon, sort_order) VALUES
  ('dashboard','Dashboard','LayoutDashboard',10),
  ('vendas','Vendas','ShoppingCart',20),
  ('ordens_servico','Ordens de Serviço','Wrench',30),
  ('produtos','Produtos','Package',40),
  ('clientes','Clientes','UserSquare',50),
  ('estoque','Estoque','Boxes',60),
  ('funcionarios','Funcionários','Users',70),
  ('relatorios','Relatórios','BarChart3',80),
  ('configuracoes','Configurações','Settings',90),
  ('modo_tv','Modo TV','Tv',100);

-- ============ EMPLOYEE PERMISSIONS ============
CREATE TABLE public.employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_key text NOT NULL REFERENCES public.system_modules(key) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_key)
);

ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own permissions" ON public.employee_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin manage permissions" ON public.employee_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============ STOCK MOVEMENTS EXTRA COLS ============
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS responsible text,
  ADD COLUMN IF NOT EXISTS movement_date timestamptz DEFAULT now();

-- ============ APPLY STOCK MOVEMENT RPC ============
CREATE OR REPLACE FUNCTION public.apply_stock_movement(
  _product_id uuid,
  _movement_type text,
  _quantity numeric,
  _reason text DEFAULT NULL,
  _supplier text DEFAULT NULL,
  _cost numeric DEFAULT 0,
  _responsible text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _movement_date timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev numeric;
  next_qty numeric;
  mov_id uuid;
  uid uuid;
  uemail text;
BEGIN
  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'Quantidade inválida';
  END IF;

  SELECT stock_qty INTO prev FROM public.products WHERE id = _product_id FOR UPDATE;
  IF prev IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;

  IF _movement_type = 'entrada' THEN
    next_qty := prev + _quantity;
  ELSIF _movement_type = 'saida' THEN
    IF prev < _quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para esta saída.';
    END IF;
    next_qty := prev - _quantity;
  ELSE
    RAISE EXCEPTION 'Tipo de movimentação inválido';
  END IF;

  UPDATE public.products SET stock_qty = next_qty, updated_at = now() WHERE id = _product_id;

  uid := auth.uid();
  SELECT email INTO uemail FROM auth.users WHERE id = uid;

  INSERT INTO public.stock_movements(
    product_id, movement_type, quantity, previous_qty, new_qty,
    reason, supplier, cost, responsible, notes, movement_date,
    user_id, user_email
  ) VALUES (
    _product_id, _movement_type::stock_movement_type, _quantity, prev, next_qty,
    _reason, _supplier, _cost, _responsible, _notes, COALESCE(_movement_date, now()),
    uid, uemail
  ) RETURNING id INTO mov_id;

  RETURN mov_id;
END;
$$;
