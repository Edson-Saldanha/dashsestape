CREATE OR REPLACE FUNCTION public.crm_render_template(_tpl text, _nome text, _equipamento text, _empresa text, _assinatura text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT replace(replace(replace(replace(coalesce(_tpl,''),
    '{{nome}}', coalesce(_nome,'')),
    '{{equipamento}}', coalesce(_equipamento,'equipamento')),
    '{{empresa}}', coalesce(_empresa,'')),
    '{{assinatura}}', coalesce(_assinatura,''));
$function$;