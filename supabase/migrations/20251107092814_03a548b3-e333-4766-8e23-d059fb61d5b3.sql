-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('student', 'landlord');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create plot verification table (simulates County Lands records)
CREATE TABLE public.verified_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_number TEXT NOT NULL UNIQUE,
  owner_name TEXT NOT NULL,
  location TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on verified_plots
ALTER TABLE public.verified_plots ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read verified plots for verification
CREATE POLICY "Anyone can view verified plots"
  ON public.verified_plots FOR SELECT
  TO authenticated
  USING (true);

-- Create hostels table
CREATE TABLE public.hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plot_number TEXT NOT NULL,
  location TEXT NOT NULL,
  rent_per_month DECIMAL(10,2) NOT NULL,
  total_rooms INTEGER NOT NULL,
  occupied_rooms INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  distance_from_gate DECIMAL(5,2),
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on hostels
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;

-- Hostels policies
CREATE POLICY "Anyone can view hostels"
  ON public.hostels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Landlords can insert their own hostels"
  ON public.hostels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own hostels"
  ON public.hostels FOR UPDATE
  TO authenticated
  USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete their own hostels"
  ON public.hostels FOR DELETE
  TO authenticated
  USING (auth.uid() = landlord_id);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_amount DECIMAL(10,2) NOT NULL,
  mpesa_transaction_id TEXT,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Bookings policies
CREATE POLICY "Students can view their own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Landlords can view bookings for their hostels"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hostels
      WHERE hostels.id = bookings.hostel_id
      AND hostels.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Students can create bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_hostels_updated_at
  BEFORE UPDATE ON public.hostels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'student')
  );
  RETURN new;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample verified plots
INSERT INTO public.verified_plots (plot_number, owner_name, location) VALUES
  ('LR209/4523', 'County Lands Office', 'Westlands, Nairobi'),
  ('LR209/8821', 'County Lands Office', 'Kilimani, Nairobi'),
  ('LR209/1156', 'County Lands Office', 'Kasarani, Nairobi'),
  ('LR209/7734', 'County Lands Office', 'Parklands, Nairobi'),
  ('LR209/3391', 'County Lands Office', 'South B, Nairobi');