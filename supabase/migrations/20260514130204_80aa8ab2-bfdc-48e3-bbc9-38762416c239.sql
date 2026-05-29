ALTER TABLE public.sales 
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_cpf text;

CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);