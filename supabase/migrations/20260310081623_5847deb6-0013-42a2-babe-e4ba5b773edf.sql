-- Drop all existing restrictive policies on contact_requests
DROP POLICY IF EXISTS "Admin can view contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Admin can update contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Admin can delete contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Anyone can insert contact requests" ON public.contact_requests;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Anyone can insert contact requests"
    ON public.contact_requests FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Admin can view contact requests"
    ON public.contact_requests FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admin can update contact requests"
    ON public.contact_requests FOR UPDATE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admin can delete contact requests"
    ON public.contact_requests FOR DELETE
    TO authenticated
    USING (public.is_admin());