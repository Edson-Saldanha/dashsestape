-- 1. Remover leitura pública anônima
DROP POLICY IF EXISTS "Public read active employees" ON public.employees;
DROP POLICY IF EXISTS "Public read sales" ON public.sales;

-- 2. Remover tabelas sensíveis da publicação realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sales') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.sales';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='employees') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.employees';
  END IF;
END $$;

-- 3. Política restritiva contra escalonamento em user_roles
CREATE POLICY "Restrict user_roles writes to owner"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

-- 4. search_path fixo em touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;