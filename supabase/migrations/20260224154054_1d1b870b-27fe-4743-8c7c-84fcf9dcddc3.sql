
-- Add title_deed_image to hostels table
ALTER TABLE public.hostels ADD COLUMN title_deed_image text;

-- Create rooms table
CREATE TABLE public.rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_id uuid NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  price_per_month numeric NOT NULL,
  is_vacant boolean NOT NULL DEFAULT true,
  description text,
  images text[] DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Anyone can view rooms
CREATE POLICY "Anyone can view rooms"
ON public.rooms FOR SELECT
USING (true);

-- Landlords can insert rooms for their own hostels
CREATE POLICY "Landlords can insert rooms for their hostels"
ON public.rooms FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hostels
    WHERE hostels.id = rooms.hostel_id
    AND hostels.landlord_id = auth.uid()
  )
  AND has_role(auth.uid(), 'landlord'::app_role)
);

-- Landlords can update rooms for their own hostels
CREATE POLICY "Landlords can update rooms for their hostels"
ON public.rooms FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.hostels
    WHERE hostels.id = rooms.hostel_id
    AND hostels.landlord_id = auth.uid()
  )
  AND has_role(auth.uid(), 'landlord'::app_role)
);

-- Landlords can delete rooms for their own hostels
CREATE POLICY "Landlords can delete rooms for their hostels"
ON public.rooms FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.hostels
    WHERE hostels.id = rooms.hostel_id
    AND hostels.landlord_id = auth.uid()
  )
  AND has_role(auth.uid(), 'landlord'::app_role)
);

-- Add room_id to bookings (students book rooms, not hostels)
ALTER TABLE public.bookings ADD COLUMN room_id uuid REFERENCES public.rooms(id);

-- Trigger for updated_at on rooms
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
