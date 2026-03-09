
-- Table for contact form submissions (from landing page visitors)
CREATE TABLE public.contact_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    session_type text,
    goal text,
    message text,
    read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Only admins can read/update contact requests
CREATE POLICY "Admin can view contact requests"
    ON public.contact_requests FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admin can update contact requests"
    ON public.contact_requests FOR UPDATE
    USING (public.is_admin());

-- Anyone can insert (public form, no auth required)
CREATE POLICY "Anyone can insert contact requests"
    ON public.contact_requests FOR INSERT
    WITH CHECK (true);

-- Only admin can delete
CREATE POLICY "Admin can delete contact requests"
    ON public.contact_requests FOR DELETE
    USING (public.is_admin());
