-- Enum types
DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('a_fazer','em_andamento','em_espera','atrasada','concluida');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('baixa','media','alta','urgente');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  employee_id uuid,
  employee_name text,
  status public.task_status NOT NULL DEFAULT 'a_fazer',
  priority public.task_priority NOT NULL DEFAULT 'media',
  category text,
  due_date timestamptz,
  notes text,
  completed_at timestamptz,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Helper: get employee_id linked to current auth user (via email)
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id FROM public.employees e
  JOIN auth.users u ON lower(u.email) = lower(e.email)
  WHERE u.id = auth.uid()
  LIMIT 1;
$$;

CREATE POLICY "Admin manage tasks" ON public.tasks
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Employee read own tasks" ON public.tasks
FOR SELECT TO authenticated
USING (employee_id = public.current_employee_id());

CREATE POLICY "Employee update own task status" ON public.tasks
FOR UPDATE TO authenticated
USING (employee_id = public.current_employee_id())
WITH CHECK (employee_id = public.current_employee_id());

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_tasks_employee ON public.tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_date);

-- Register module for permissions
INSERT INTO public.system_modules(key, label, icon, sort_order)
VALUES ('tarefas','Tarefas','ListTodo', 75)
ON CONFLICT DO NOTHING;