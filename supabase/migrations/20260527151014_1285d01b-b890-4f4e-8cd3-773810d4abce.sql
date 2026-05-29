-- Remove possíveis duplicatas antes de criar a constraint
DELETE FROM public.employee_permissions a
USING public.employee_permissions b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.module_key = b.module_key;

ALTER TABLE public.employee_permissions
  DROP CONSTRAINT IF EXISTS employee_permissions_user_module_unique;

ALTER TABLE public.employee_permissions
  ADD CONSTRAINT employee_permissions_user_module_unique UNIQUE (user_id, module_key);