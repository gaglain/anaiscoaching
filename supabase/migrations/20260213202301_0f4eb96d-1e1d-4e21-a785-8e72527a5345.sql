
-- Create a categories table for documents and clients
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('document', 'client')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name, type)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Admin can manage categories
CREATE POLICY "Admin can manage categories"
ON public.categories
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- All authenticated users can view categories
CREATE POLICY "Authenticated users can view categories"
ON public.categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default document categories
INSERT INTO public.categories (name, type) VALUES
('Général', 'document'),
('Programme d''entraînement', 'document'),
('Nutrition', 'document'),
('Bilan / Suivi', 'document'),
('Facture', 'document');

-- Insert default client categories
INSERT INTO public.categories (name, type) VALUES
('VIP', 'client'),
('Régulier', 'client'),
('Nouveau', 'client');
