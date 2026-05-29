
-- Profiles for admin
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Employees
CREATE TYPE public.employee_role AS ENUM ('vendedor','tecnico','gestor','financeiro','outro');
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role public.employee_role NOT NULL DEFAULT 'vendedor',
  photo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Public read for TV mode
CREATE POLICY "Public read active employees" ON public.employees FOR SELECT TO anon USING (true);

-- Sales
CREATE TYPE public.sale_type AS ENUM ('venda','servico','lancamento');
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL,
  type public.sale_type NOT NULL DEFAULT 'venda',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  product TEXT,
  notes TEXT,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write sales" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read sales" ON public.sales FOR SELECT TO anon USING (true);

-- Settings (single row)
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  monthly_goal NUMERIC(12,2) NOT NULL DEFAULT 100000,
  company_name TEXT NOT NULL DEFAULT 'Minha Empresa',
  logo_url TEXT,
  tv_sounds BOOLEAN NOT NULL DEFAULT true,
  primary_color TEXT NOT NULL DEFAULT '#1e40af',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settings_singleton CHECK (id = 1)
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Auth update settings" ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
INSERT INTO public.settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.employees REPLICA IDENTITY FULL;
ALTER TABLE public.settings REPLICA IDENTITY FULL;
