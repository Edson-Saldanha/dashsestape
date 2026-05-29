-- Suppliers
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  phone text,
  whatsapp text,
  email text,
  address text,
  contact_name text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete suppliers" ON public.suppliers FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'owner'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER suppliers_touch BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Status enum
CREATE TYPE public.purchase_order_status AS ENUM ('em_aberto','aguardando_pagamento','pago','cancelado');

-- Sequence for order numbers
CREATE SEQUENCE public.purchase_orders_number_seq START 1;

-- Purchase orders
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number integer NOT NULL DEFAULT nextval('public.purchase_orders_number_seq'),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name text,
  order_date timestamptz NOT NULL DEFAULT now(),
  expected_date timestamptz,
  payment_method text,
  status public.purchase_order_status NOT NULL DEFAULT 'em_aberto',
  notes text,
  total_amount numeric NOT NULL DEFAULT 0,
  total_items numeric NOT NULL DEFAULT 0,
  settled_at timestamptz,
  settled_by uuid,
  settled_by_email text,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER SEQUENCE public.purchase_orders_number_seq OWNED BY public.purchase_orders.order_number;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read po" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert po" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update po" ON public.purchase_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete po" ON public.purchase_orders FOR DELETE TO authenticated USING (true);
CREATE TRIGGER po_touch BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Items
CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  quantity numeric NOT NULL DEFAULT 0,
  current_cost numeric NOT NULL DEFAULT 0,
  new_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_poi_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_poi_prod ON public.purchase_order_items(product_id);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read poi" ON public.purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert poi" ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update poi" ON public.purchase_order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete poi" ON public.purchase_order_items FOR DELETE TO authenticated USING (true);

-- Product cost history
CREATE TABLE public.product_cost_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  previous_cost numeric NOT NULL DEFAULT 0,
  new_cost numeric NOT NULL DEFAULT 0,
  supplier_id uuid,
  supplier_name text,
  purchase_order_id uuid,
  purchase_order_number integer,
  changed_by uuid,
  changed_by_email text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pch_product ON public.product_cost_history(product_id);
ALTER TABLE public.product_cost_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read pch" ON public.product_cost_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert pch" ON public.product_cost_history FOR INSERT TO authenticated WITH CHECK (true);

-- Module
INSERT INTO public.system_modules (key, label, icon, sort_order)
VALUES ('novos_pedidos', 'Novos Pedidos', 'ClipboardList', 65)
ON CONFLICT (key) DO NOTHING;

-- Settle (quitar) purchase order
CREATE OR REPLACE FUNCTION public.settle_purchase_order(_po_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po record;
  it record;
  prev_cost numeric;
  uid uuid;
  uemail text;
BEGIN
  uid := auth.uid();
  SELECT email INTO uemail FROM auth.users WHERE id = uid;

  SELECT * INTO po FROM public.purchase_orders WHERE id = _po_id FOR UPDATE;
  IF po.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF po.status = 'pago' THEN RAISE EXCEPTION 'Pedido já está quitado'; END IF;
  IF po.status = 'cancelado' THEN RAISE EXCEPTION 'Pedido cancelado não pode ser quitado'; END IF;

  FOR it IN SELECT * FROM public.purchase_order_items WHERE purchase_order_id = _po_id LOOP
    IF it.product_id IS NOT NULL AND it.quantity > 0 THEN
      -- entrada estoque
      PERFORM public.apply_stock_movement(
        it.product_id, 'entrada', it.quantity,
        'Pedido de compra #' || po.order_number,
        po.supplier_name, COALESCE(it.new_cost, 0),
        uemail, 'Quitação automática do pedido', now()
      );
      -- atualizar custo
      SELECT cost_price INTO prev_cost FROM public.products WHERE id = it.product_id;
      IF COALESCE(it.new_cost,0) > 0 AND COALESCE(it.new_cost,0) <> COALESCE(prev_cost,0) THEN
        UPDATE public.products
          SET cost_price = it.new_cost,
              supplier = COALESCE(po.supplier_name, supplier),
              last_purchase_date = now(),
              updated_at = now()
          WHERE id = it.product_id;
        INSERT INTO public.product_cost_history(
          product_id, previous_cost, new_cost,
          supplier_id, supplier_name,
          purchase_order_id, purchase_order_number,
          changed_by, changed_by_email
        ) VALUES (
          it.product_id, COALESCE(prev_cost,0), it.new_cost,
          po.supplier_id, po.supplier_name,
          po.id, po.order_number,
          uid, uemail
        );
      ELSIF COALESCE(prev_cost,0) = 0 AND COALESCE(it.new_cost,0) = 0 THEN
        -- nada
        NULL;
      ELSE
        UPDATE public.products
          SET supplier = COALESCE(po.supplier_name, supplier),
              last_purchase_date = now(),
              updated_at = now()
          WHERE id = it.product_id;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.purchase_orders
    SET status = 'pago', settled_at = now(), settled_by = uid, settled_by_email = uemail, updated_at = now()
    WHERE id = _po_id;
END;
$$;
