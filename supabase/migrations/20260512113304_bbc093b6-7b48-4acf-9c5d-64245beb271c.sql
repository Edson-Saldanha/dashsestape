ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email text;
CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique ON public.employees (lower(email)) WHERE email IS NOT NULL;