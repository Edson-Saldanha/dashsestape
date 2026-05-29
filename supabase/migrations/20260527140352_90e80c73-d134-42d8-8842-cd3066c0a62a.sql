
-- Enum
CREATE TYPE public.evaluation_status AS ENUM (
  'recebido',
  'aguardando_avaliacao',
  'em_avaliacao',
  'aguardando_aprovacao_cliente',
  'aprovado_compra',
  'recusado_loja',
  'cliente_recusou',
  'comprado',
  'em_manutencao',
  'pronto_revenda',
  'vendido',
  'devolvido'
);

-- Sequence
CREATE SEQUENCE public.product_evaluations_number_seq START 1;

-- Tabela principal
CREATE TABLE public.product_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_number integer NOT NULL DEFAULT nextval('public.product_evaluations_number_seq'),
  status public.evaluation_status NOT NULL DEFAULT 'recebido',

  -- Cliente
  customer_id uuid,
  customer_name text NOT NULL,
  customer_phone text,
  customer_cpf text,
  customer_notes text,

  -- Entrada
  entry_date timestamptz NOT NULL DEFAULT now(),
  received_by_id uuid,
  received_by_name text,
  store_unit text,

  -- Produto
  category text,
  brand text,
  model text,
  serial_number text,
  color text,
  visual_condition text,
  accessories text,
  has_box boolean NOT NULL DEFAULT false,
  has_charger boolean NOT NULL DEFAULT false,
  client_reported_defects text,
  apparent_defects text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Avaliação técnica
  technician_id uuid,
  technician_name text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  battery_status text,
  screen_status text,
  case_status text,
  charging_test text,
  audio_test text,
  camera_test text,
  keyboard_test text,
  ports_test text,
  technical_notes text,
  estimated_repair_cost numeric NOT NULL DEFAULT 0,
  estimated_market_value numeric NOT NULL DEFAULT 0,
  max_purchase_value numeric NOT NULL DEFAULT 0,
  offered_value numeric NOT NULL DEFAULT 0,

  -- Negociação
  proposal_sent_at timestamptz,
  proposal_by_id uuid,
  proposal_by_name text,
  client_response text,
  final_value numeric NOT NULL DEFAULT 0,
  payment_method text,
  payment_receipt_url text,

  -- Audit
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_evaluations TO authenticated;
GRANT ALL ON public.product_evaluations TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.product_evaluations_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.product_evaluations_number_seq TO service_role;

ALTER TABLE public.product_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read evaluations" ON public.product_evaluations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert evaluations" ON public.product_evaluations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update evaluations" ON public.product_evaluations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete evaluations" ON public.product_evaluations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER product_evaluations_updated_at
  BEFORE UPDATE ON public.product_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Histórico
CREATE TABLE public.product_evaluation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id uuid NOT NULL,
  action text NOT NULL,
  from_status public.evaluation_status,
  to_status public.evaluation_status,
  notes text,
  user_id uuid,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_history_eval ON public.product_evaluation_history(evaluation_id, created_at DESC);

GRANT SELECT, INSERT ON public.product_evaluation_history TO authenticated;
GRANT ALL ON public.product_evaluation_history TO service_role;

ALTER TABLE public.product_evaluation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read eval history" ON public.product_evaluation_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert eval history" ON public.product_evaluation_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger: registra mudança de status automaticamente
CREATE OR REPLACE FUNCTION public.product_evaluations_log_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  uemail text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    uid := auth.uid();
    SELECT email INTO uemail FROM auth.users WHERE id = uid;
    INSERT INTO public.product_evaluation_history(evaluation_id, action, to_status, notes, user_id, user_email)
    VALUES (NEW.id, 'criado', NEW.status, 'Avaliação criada', uid, uemail);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    uid := auth.uid();
    SELECT email INTO uemail FROM auth.users WHERE id = uid;
    NEW.status_changed_at := now();
    INSERT INTO public.product_evaluation_history(evaluation_id, action, from_status, to_status, user_id, user_email)
    VALUES (NEW.id, 'mudanca_status', OLD.status, NEW.status, uid, uemail);
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_eval_log_status_ins
  AFTER INSERT ON public.product_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.product_evaluations_log_status();

CREATE TRIGGER trg_eval_log_status_upd
  BEFORE UPDATE ON public.product_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.product_evaluations_log_status();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-evaluations', 'product-evaluations', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product evaluations" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-evaluations');
CREATE POLICY "Auth upload product evaluations" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-evaluations');
CREATE POLICY "Auth update product evaluations" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-evaluations');
CREATE POLICY "Auth delete product evaluations" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-evaluations');

-- Módulo
INSERT INTO public.system_modules (key, label, icon, sort_order)
VALUES ('avaliacao_produtos', 'Avaliação de Produtos', 'ClipboardCheck', 75)
ON CONFLICT (key) DO NOTHING;
