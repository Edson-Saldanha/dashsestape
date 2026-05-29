-- Marca cliente como colaborador
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_collaborator boolean NOT NULL DEFAULT false;

-- Compras na carteira do colaborador (cabeçalho)
CREATE TABLE IF NOT EXISTS public.customer_wallet_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  customer_name text,
  purchase_date timestamptz NOT NULL DEFAULT now(),
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,
  deduct_stock boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_wallet_purchases TO authenticated;
GRANT ALL ON public.customer_wallet_purchases TO service_role;

ALTER TABLE public.customer_wallet_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read wallet purchases" ON public.customer_wallet_purchases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert wallet purchases" ON public.customer_wallet_purchases
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update wallet purchases" ON public.customer_wallet_purchases
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete wallet purchases" ON public.customer_wallet_purchases
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX IF NOT EXISTS idx_wallet_purchases_customer ON public.customer_wallet_purchases(customer_id);

CREATE TRIGGER trg_wallet_purchases_touch
  BEFORE UPDATE ON public.customer_wallet_purchases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Parcelas
CREATE TABLE IF NOT EXISTS public.customer_wallet_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.customer_wallet_purchases(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  installment_number integer NOT NULL DEFAULT 1,
  due_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  paid_by uuid,
  paid_by_email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_wallet_installments TO authenticated;
GRANT ALL ON public.customer_wallet_installments TO service_role;

ALTER TABLE public.customer_wallet_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read wallet installments" ON public.customer_wallet_installments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert wallet installments" ON public.customer_wallet_installments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update wallet installments" ON public.customer_wallet_installments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete wallet installments" ON public.customer_wallet_installments
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX IF NOT EXISTS idx_wallet_inst_purchase ON public.customer_wallet_installments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_wallet_inst_customer ON public.customer_wallet_installments(customer_id);

CREATE TRIGGER trg_wallet_installments_touch
  BEFORE UPDATE ON public.customer_wallet_installments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();