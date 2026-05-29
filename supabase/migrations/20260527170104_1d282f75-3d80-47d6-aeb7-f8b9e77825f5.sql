CREATE POLICY "Employee insert own tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (employee_id = public.current_employee_id());