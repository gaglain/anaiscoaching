ALTER TABLE public.contact_replies ADD COLUMN sender TEXT NOT NULL DEFAULT 'admin';

-- Allow public/anonymous access for webhook inserts
CREATE POLICY "Webhook can insert prospect replies" ON public.contact_replies
  FOR INSERT TO anon WITH CHECK (sender = 'prospect');