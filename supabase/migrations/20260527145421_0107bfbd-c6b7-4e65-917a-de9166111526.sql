ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS purchase_authorized BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS purchase_authorized_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS purchase_authorized_by UUID,
  ADD COLUMN IF NOT EXISTS purchase_authorized_by_email TEXT;