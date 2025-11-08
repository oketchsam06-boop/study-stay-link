-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Now create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Migrate existing profile roles to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Now remove role from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Update RLS policies for hostels
DROP POLICY IF EXISTS "Landlords can insert their own hostels" ON public.hostels;
CREATE POLICY "Landlords can insert their own hostels"
ON public.hostels
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = landlord_id AND public.has_role(auth.uid(), 'landlord'));

DROP POLICY IF EXISTS "Landlords can update their own hostels" ON public.hostels;
CREATE POLICY "Landlords can update their own hostels"
ON public.hostels
FOR UPDATE
TO authenticated
USING (auth.uid() = landlord_id AND public.has_role(auth.uid(), 'landlord'));

DROP POLICY IF EXISTS "Landlords can delete their own hostels" ON public.hostels;
CREATE POLICY "Landlords can delete their own hostels"
ON public.hostels
FOR DELETE
TO authenticated
USING (auth.uid() = landlord_id AND public.has_role(auth.uid(), 'landlord'));

-- Update booking policies
DROP POLICY IF EXISTS "Students can create bookings" ON public.bookings;
CREATE POLICY "Students can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id AND public.has_role(auth.uid(), 'student'));

-- Create storage bucket for hostel images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hostel-images',
  'hostel-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for hostel images
CREATE POLICY "Anyone can view hostel images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'hostel-images');

CREATE POLICY "Landlords can upload hostel images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hostel-images' 
  AND public.has_role(auth.uid(), 'landlord')
);

CREATE POLICY "Landlords can update their hostel images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hostel-images' 
  AND public.has_role(auth.uid(), 'landlord')
);

CREATE POLICY "Landlords can delete their hostel images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'hostel-images' 
  AND public.has_role(auth.uid(), 'landlord')
);

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email
  );
  
  -- Insert role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id,
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'student')
  );
  
  RETURN new;
END;
$$;

-- Add verified plots for testing
INSERT INTO public.verified_plots (plot_number, location, owner_name)
VALUES 
  ('PLT/001/2024', 'Ngara Road', 'John Doe'),
  ('PLT/002/2024', 'Thika Road', 'Jane Smith'),
  ('PLT/003/2024', 'Jogoo Road', 'Bob Johnson'),
  ('PLT/004/2024', 'Uhuru Highway', 'Alice Williams')
ON CONFLICT DO NOTHING;