
-- Enum status da OS
CREATE TYPE public.os_status AS ENUM ('aberta','em_analise','aguardando_peca','em_manutencao','finalizada','entregue','cancelada');

-- Sequência para número da OS
CREATE SEQUENCE IF NOT EXISTS public.service_orders_number_seq START 1000;

CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_number INTEGER NOT NULL UNIQUE DEFAULT nextval('public.service_orders_number_seq'),

  -- Cliente
  client_name TEXT NOT NULL,
  client_phone TEXT,
  product TEXT,
  defect TEXT,

  -- Técnico
  technician_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  technician_name TEXT,

  -- Datas
  entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_date TIMESTAMPTZ,

  -- Status
  status public.os_status NOT NULL DEFAULT 'aberta',

  -- Financeiro
  service_value NUMERIC NOT NULL DEFAULT 0,
  parts_cost NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  amount_paid NUMERIC NOT NULL DEFAULT 0,

  -- Observações
  technician_notes TEXT,

  -- Auditoria
  created_by UUID,
  created_by_email TEXT,
  finalized_by UUID,
  finalized_by_email TEXT,
  finalized_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read service_orders" ON public.service_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert service_orders" ON public.service_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update service_orders" ON public.service_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth delete service_orders" ON public.service_orders FOR DELETE TO authenticated USING (true);

-- Histórico
CREATE TABLE public.service_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_status public.os_status,
  to_status public.os_status,
  user_id UUID,
  user_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_order_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read os_history" ON public.service_order_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert os_history" ON public.service_order_history FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_service_orders_updated
BEFORE UPDATE ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
