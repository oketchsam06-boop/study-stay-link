
-- 1. Add new columns to bookings for escrow system
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS total_paid numeric GENERATED ALWAYS AS (deposit_amount + platform_fee) STORED,
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'pending'
    CHECK (escrow_status IN ('pending', 'held_in_escrow', 'released_to_landlord', 'refunded_to_student', 'under_review')),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS admin_resolution text;

-- 2. Create receipts table
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  receipt_number text NOT NULL UNIQUE,
  deposit_amount numeric NOT NULL,
  platform_fee numeric NOT NULL,
  total_paid numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'mpesa',
  status text NOT NULL DEFAULT 'deposit_held',
  issued_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own receipts"
  ON public.receipts FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "System can insert receipts"
  ON public.receipts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Landlords can view receipts for their hostels"
  ON public.receipts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bookings b
    JOIN hostels h ON h.id = b.hostel_id
    WHERE b.id = receipts.booking_id AND h.landlord_id = auth.uid()
  ));

-- 3. Update the booking trigger to set escrow_status
CREATE OR REPLACE FUNCTION public.enforce_single_room_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_vacant boolean;
BEGIN
  IF NEW.room_id IS NULL THEN
    RAISE EXCEPTION 'ROOM_ID_REQUIRED';
  END IF;

  SELECT is_vacant
  INTO room_vacant
  FROM public.rooms
  WHERE id = NEW.room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF room_vacant IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ROOM_ALREADY_BOOKED';
  END IF;

  UPDATE public.rooms
  SET is_vacant = false
  WHERE id = NEW.room_id;

  -- Set escrow status automatically
  NEW.escrow_status := 'held_in_escrow';
  NEW.payment_status := 'completed';

  RETURN NEW;
END;
$$;

-- 4. Allow students to update their own bookings (for confirm/cancel)
CREATE POLICY "Students can update their own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = student_id);

-- 5. Enable realtime for bookings so landlords get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
