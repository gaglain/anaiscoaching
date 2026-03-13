
CREATE TABLE public.contact_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_request_id UUID NOT NULL REFERENCES public.contact_requests(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage contact replies" ON public.contact_replies
  FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());
