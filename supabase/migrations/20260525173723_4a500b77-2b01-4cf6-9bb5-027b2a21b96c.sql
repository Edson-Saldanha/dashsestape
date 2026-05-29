DROP POLICY IF EXISTS "Public read settings" ON public.settings;
CREATE POLICY "Auth read settings" ON public.settings FOR SELECT TO authenticated USING (true);