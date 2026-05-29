-- Fix 1: activity_log forged user_email
DROP POLICY IF EXISTS "Users insert own activity" ON public.activity_log;
CREATE POLICY "Users insert own activity"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    user_email IS NULL
    OR lower(user_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

-- Fix 2: restrict sensitive CRM integration columns in settings
REVOKE SELECT (crm_webhook_url, crm_official_number) ON public.settings FROM authenticated;
REVOKE UPDATE (crm_webhook_url, crm_official_number) ON public.settings FROM authenticated;
REVOKE INSERT (crm_webhook_url, crm_official_number) ON public.settings FROM authenticated;

-- Admin-only RPC to read CRM integration secrets
CREATE OR REPLACE FUNCTION public.get_crm_integration()
RETURNS TABLE(crm_webhook_url text, crm_official_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas administradores podem visualizar essas configurações';
  END IF;
  RETURN QUERY SELECT s.crm_webhook_url, s.crm_official_number FROM public.settings s WHERE s.id = 1;
END;
$$;

-- Admin-only RPC to update CRM integration secrets
CREATE OR REPLACE FUNCTION public.update_crm_integration(_webhook_url text, _official_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar essas configurações';
  END IF;
  UPDATE public.settings
    SET crm_webhook_url = _webhook_url,
        crm_official_number = _official_number,
        updated_at = now()
    WHERE id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_crm_integration() FROM public;
REVOKE ALL ON FUNCTION public.update_crm_integration(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_crm_integration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_crm_integration(text, text) TO authenticated;