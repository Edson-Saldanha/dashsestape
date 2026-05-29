
-- 1. Expand customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS ultima_visita timestamptz,
  ADD COLUMN IF NOT EXISTS status_cliente text NOT NULL DEFAULT 'ativo';

-- 2. Enums
DO $$ BEGIN
  CREATE TYPE public.crm_lembrete_tipo AS ENUM ('30_dias','60_dias','90_dias','6_meses','1_ano','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.crm_lembrete_status AS ENUM ('aguardando','pronto_para_envio','enviado','respondeu','agendou','nao_respondeu','erro','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. manutencoes
CREATE TABLE IF NOT EXISTS public.manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  data_atendimento timestamptz NOT NULL DEFAULT now(),
  equipamento text,
  marca text,
  modelo text,
  problema_relatado text,
  servico_realizado text,
  solucao_aplicada text,
  valor_cobrado numeric NOT NULL DEFAULT 0,
  responsavel_atendimento text,
  observacoes_internas text,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencoes TO authenticated;
GRANT ALL ON public.manutencoes TO service_role;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read manutencoes" ON public.manutencoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert manutencoes" ON public.manutencoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update manutencoes" ON public.manutencoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete manutencoes" ON public.manutencoes FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'owner'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_manutencoes_cliente ON public.manutencoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_data ON public.manutencoes(data_atendimento DESC);

-- 4. lembretes_whatsapp
CREATE TABLE IF NOT EXISTS public.lembretes_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  manutencao_id uuid REFERENCES public.manutencoes(id) ON DELETE CASCADE,
  tipo_lembrete crm_lembrete_tipo NOT NULL,
  data_programada date NOT NULL,
  status crm_lembrete_status NOT NULL DEFAULT 'aguardando',
  mensagem text,
  enviado_em timestamptz,
  respondido_em timestamptz,
  agendado_em timestamptz,
  erro_envio text,
  tentativa_envio integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lembretes_whatsapp TO authenticated;
GRANT ALL ON public.lembretes_whatsapp TO service_role;
ALTER TABLE public.lembretes_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read lembretes" ON public.lembretes_whatsapp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert lembretes" ON public.lembretes_whatsapp FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update lembretes" ON public.lembretes_whatsapp FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete lembretes" ON public.lembretes_whatsapp FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'owner'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_lembretes_data ON public.lembretes_whatsapp(data_programada);
CREATE INDEX IF NOT EXISTS idx_lembretes_status ON public.lembretes_whatsapp(status);
CREATE INDEX IF NOT EXISTS idx_lembretes_cliente ON public.lembretes_whatsapp(cliente_id);

-- 5. mensagens_whatsapp
CREATE TABLE IF NOT EXISTS public.mensagens_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  lembrete_id uuid REFERENCES public.lembretes_whatsapp(id) ON DELETE SET NULL,
  telefone text,
  mensagem text NOT NULL,
  tipo_mensagem text NOT NULL DEFAULT 'manual',
  status_envio text NOT NULL DEFAULT 'enviado',
  enviado_em timestamptz NOT NULL DEFAULT now(),
  resposta_cliente text,
  erro_envio text,
  canal text NOT NULL DEFAULT 'wa.me',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens_whatsapp TO authenticated;
GRANT ALL ON public.mensagens_whatsapp TO service_role;
ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read msgs" ON public.mensagens_whatsapp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert msgs" ON public.mensagens_whatsapp FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update msgs" ON public.mensagens_whatsapp FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin delete msgs" ON public.mensagens_whatsapp FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'owner'::app_role) OR has_role(auth.uid(),'admin'::app_role));

-- 6. settings extension
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS crm_webhook_url text,
  ADD COLUMN IF NOT EXISTS crm_auto_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crm_default_hour text NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS crm_signature text DEFAULT 'Equipe Sestape',
  ADD COLUMN IF NOT EXISTS crm_official_number text,
  ADD COLUMN IF NOT EXISTS crm_template_30 text DEFAULT 'Oi, {{nome}}, tudo bem? Aqui é da {{empresa}}.

Passando só para saber se o seu {{equipamento}} está funcionando certinho depois da manutenção que fizemos há alguns dias.

Qualquer sinal de lentidão, aquecimento ou travamento, pode me chamar por aqui.

{{assinatura}}',
  ADD COLUMN IF NOT EXISTS crm_template_60 text DEFAULT 'Oi, {{nome}}, tudo bem?

Já faz cerca de 60 dias desde a última manutenção do seu {{equipamento}}.

Se você percebeu lentidão, aquecimento, barulho diferente ou travamentos, é melhor verificar antes que vire um problema maior.

Quer que eu veja um horário para você?

{{assinatura}}',
  ADD COLUMN IF NOT EXISTS crm_template_90 text DEFAULT 'Oi, {{nome}}, tudo bem?

Já fazem cerca de 90 dias desde a última manutenção do seu {{equipamento}}.

Esse é um bom momento para fazer uma revisão preventiva e evitar superaquecimento, lentidão ou acúmulo de sujeira.

Quer que eu veja um horário para você trazer aqui na loja?

{{assinatura}}',
  ADD COLUMN IF NOT EXISTS crm_template_6m text DEFAULT 'Oi, {{nome}}! Já se passaram 6 meses desde a última manutenção do seu {{equipamento}}. Que tal agendarmos uma revisão preventiva?

{{assinatura}}',
  ADD COLUMN IF NOT EXISTS crm_template_1y text DEFAULT 'Oi, {{nome}}! Já faz 1 ano desde a última manutenção do seu {{equipamento}}. Recomendamos uma revisão completa. Posso reservar um horário pra você?

{{assinatura}}';

-- 7. Template rendering helper
CREATE OR REPLACE FUNCTION public.crm_render_template(_tpl text, _nome text, _equipamento text, _empresa text, _assinatura text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(replace(coalesce(_tpl,''),
    '{{nome}}', coalesce(_nome,'')),
    '{{equipamento}}', coalesce(_equipamento,'equipamento')),
    '{{empresa}}', coalesce(_empresa,'')),
    '{{assinatura}}', coalesce(_assinatura,''));
$$;

-- 8. Trigger: on manutencoes insert, update customer + generate 3 reminders
CREATE OR REPLACE FUNCTION public.crm_after_manutencao_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record;
  c record;
  empresa text;
  assinatura text;
BEGIN
  -- Update last visit
  UPDATE public.customers
    SET ultima_visita = GREATEST(COALESCE(ultima_visita, NEW.data_atendimento), NEW.data_atendimento),
        updated_at = now()
    WHERE id = NEW.cliente_id;

  SELECT * INTO s FROM public.settings WHERE id = 1;
  SELECT * INTO c FROM public.customers WHERE id = NEW.cliente_id;
  empresa := COALESCE(s.company_name,'');
  assinatura := COALESCE(s.crm_signature,'');

  INSERT INTO public.lembretes_whatsapp (cliente_id, manutencao_id, tipo_lembrete, data_programada, status, mensagem)
  VALUES
    (NEW.cliente_id, NEW.id, '30_dias', (NEW.data_atendimento + interval '30 days')::date, 'aguardando',
      public.crm_render_template(s.crm_template_30, c.name, NEW.equipamento, empresa, assinatura)),
    (NEW.cliente_id, NEW.id, '60_dias', (NEW.data_atendimento + interval '60 days')::date, 'aguardando',
      public.crm_render_template(s.crm_template_60, c.name, NEW.equipamento, empresa, assinatura)),
    (NEW.cliente_id, NEW.id, '90_dias', (NEW.data_atendimento + interval '90 days')::date, 'aguardando',
      public.crm_render_template(s.crm_template_90, c.name, NEW.equipamento, empresa, assinatura));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_after_manutencao_insert ON public.manutencoes;
CREATE TRIGGER trg_crm_after_manutencao_insert
  AFTER INSERT ON public.manutencoes
  FOR EACH ROW EXECUTE FUNCTION public.crm_after_manutencao_insert();

-- 9. updated_at triggers
DROP TRIGGER IF EXISTS trg_manutencoes_touch ON public.manutencoes;
CREATE TRIGGER trg_manutencoes_touch BEFORE UPDATE ON public.manutencoes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_lembretes_touch ON public.lembretes_whatsapp;
CREATE TRIGGER trg_lembretes_touch BEFORE UPDATE ON public.lembretes_whatsapp FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 10. Register CRM module for permissions
INSERT INTO public.system_modules (key, label, icon, sort_order)
VALUES ('crm','CRM Pós-venda','HeartHandshake', 50)
ON CONFLICT (key) DO NOTHING;
