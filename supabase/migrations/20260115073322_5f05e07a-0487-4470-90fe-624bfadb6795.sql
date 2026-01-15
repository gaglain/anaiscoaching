-- =============================================
-- PHASE 1: ENUMS
-- =============================================

-- Role enum for user types
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

-- Booking status enum
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- =============================================
-- PHASE 2: BASE TABLES
-- =============================================

-- Profiles table for client information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    goals TEXT,
    level TEXT DEFAULT 'beginner',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bookings table for session requests
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_date TIMESTAMP WITH TIME ZONE NOT NULL,
    session_type TEXT NOT NULL DEFAULT 'individual',
    goals TEXT,
    notes TEXT,
    status public.booking_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages table for internal messaging
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 3: USER ROLES TABLE (Separate for security)
-- =============================================

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- =============================================
-- PHASE 4: HELPER FUNCTIONS
-- =============================================

-- Function to check if current user is admin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
$$;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger function to create profile and assign client role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- PHASE 5: TRIGGERS
-- =============================================

-- Update timestamps triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and assign role on new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- PHASE 6: ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 7: RLS POLICIES
-- =============================================

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile or admin can view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "System can insert profiles via trigger"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- USER_ROLES POLICIES (Critical: prevent self-escalation)
CREATE POLICY "Users can view own role or admin can view all"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Only admin can insert roles"
    ON public.user_roles FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Only admin can update roles"
    ON public.user_roles FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Only admin can delete roles"
    ON public.user_roles FOR DELETE
    USING (public.is_admin());

-- BOOKINGS POLICIES
CREATE POLICY "Clients can view own bookings or admin can view all"
    ON public.bookings FOR SELECT
    USING (client_id = auth.uid() OR public.is_admin());

CREATE POLICY "Clients can create own bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update own bookings (cancel only)"
    ON public.bookings FOR UPDATE
    USING (client_id = auth.uid() AND status != 'confirmed');

CREATE POLICY "Admin can update all bookings"
    ON public.bookings FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Only admin can delete bookings"
    ON public.bookings FOR DELETE
    USING (public.is_admin());

-- MESSAGES POLICIES
CREATE POLICY "Users can view own messages"
    ON public.messages FOR SELECT
    USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can send messages"
    ON public.messages FOR INSERT
    WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Receivers can mark messages as read"
    ON public.messages FOR UPDATE
    USING (receiver_id = auth.uid() OR public.is_admin());

-- =============================================
-- PHASE 8: INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_session_date ON public.bookings(session_date);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- =============================================
-- PHASE 9: REALTIME FOR MESSAGES
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;