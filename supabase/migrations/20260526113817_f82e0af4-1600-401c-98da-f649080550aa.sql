DROP POLICY IF EXISTS "Authenticated insert activity" ON public.activity_log;

CREATE POLICY "Users insert own activity"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());