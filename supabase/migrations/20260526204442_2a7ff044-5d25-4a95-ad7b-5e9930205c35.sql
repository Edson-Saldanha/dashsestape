
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sale_price_table2 numeric NOT NULL DEFAULT 0;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quantity numeric NOT NULL DEFAULT 1;
