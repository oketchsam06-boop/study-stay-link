
-- Function: confirm_booking (called by student)
-- Atomically releases deposit to landlord wallet
CREATE OR REPLACE FUNCTION public.confirm_booking(_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking bookings%ROWTYPE;
  _landlord_id uuid;
  _wallet_id uuid;
  _wallet_balance numeric;
  _wallet_earned numeric;
  _hostel_name text;
  _room_number text;
BEGIN
  -- Get and lock booking
  SELECT * INTO _booking FROM bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found';
  END IF;
  
  -- Only the student who made the booking can confirm
  IF _booking.student_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Must be in escrow
  IF _booking.escrow_status != 'held_in_escrow' THEN
    RAISE EXCEPTION 'Booking not in escrow';
  END IF;

  -- Update booking status
  UPDATE bookings SET
    escrow_status = 'released_to_landlord',
    confirmed_at = now()
  WHERE id = _booking_id;

  -- Get landlord
  SELECT landlord_id, name INTO _landlord_id, _hostel_name FROM hostels WHERE id = _booking.hostel_id;
  SELECT room_number INTO _room_number FROM rooms WHERE id = _booking.room_id;

  -- Get or create wallet
  SELECT id, balance, total_earned INTO _wallet_id, _wallet_balance, _wallet_earned
  FROM wallets WHERE landlord_id = _landlord_id;
  
  IF _wallet_id IS NULL THEN
    INSERT INTO wallets (landlord_id) VALUES (_landlord_id)
    RETURNING id, balance, total_earned INTO _wallet_id, _wallet_balance, _wallet_earned;
  END IF;

  -- Credit wallet
  INSERT INTO wallet_transactions (wallet_id, booking_id, type, amount, description)
  VALUES (_wallet_id, _booking_id, 'deposit_release', _booking.deposit_amount,
    'Deposit from ' || COALESCE(_hostel_name, 'Unknown') || ' - Room ' || COALESCE(_room_number, 'N/A'));

  UPDATE wallets SET
    balance = _wallet_balance + _booking.deposit_amount,
    total_earned = _wallet_earned + _booking.deposit_amount
  WHERE id = _wallet_id;
END;
$$;

-- Function: admin_refund_booking (called by admin)
-- Refunds student and marks room vacant
CREATE OR REPLACE FUNCTION public.admin_refund_booking(_booking_id uuid, _resolution text DEFAULT 'Admin refunded deposit to student')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking bookings%ROWTYPE;
BEGIN
  -- Only admins
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _booking FROM bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

  -- Update booking
  UPDATE bookings SET
    escrow_status = 'refunded_to_student',
    admin_resolution = _resolution,
    cancelled_at = now()
  WHERE id = _booking_id;

  -- Mark room vacant
  IF _booking.room_id IS NOT NULL THEN
    UPDATE rooms SET is_vacant = true WHERE id = _booking.room_id;
  END IF;
END;
$$;

-- Function: admin_release_booking (called by admin for disputes)
CREATE OR REPLACE FUNCTION public.admin_release_booking(_booking_id uuid, _resolution text DEFAULT 'Admin released deposit to landlord')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _booking bookings%ROWTYPE;
  _landlord_id uuid;
  _wallet_id uuid;
  _wallet_balance numeric;
  _wallet_earned numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO _booking FROM bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;

  UPDATE bookings SET
    escrow_status = 'released_to_landlord',
    admin_resolution = _resolution,
    confirmed_at = now()
  WHERE id = _booking_id;

  SELECT landlord_id INTO _landlord_id FROM hostels WHERE id = _booking.hostel_id;

  SELECT id, balance, total_earned INTO _wallet_id, _wallet_balance, _wallet_earned
  FROM wallets WHERE landlord_id = _landlord_id;
  
  IF _wallet_id IS NULL THEN
    INSERT INTO wallets (landlord_id) VALUES (_landlord_id)
    RETURNING id, balance, total_earned INTO _wallet_id, _wallet_balance, _wallet_earned;
  END IF;

  INSERT INTO wallet_transactions (wallet_id, booking_id, type, amount, description)
  VALUES (_wallet_id, _booking_id, 'dispute_release', _booking.deposit_amount, 'Dispute resolved — deposit released');

  UPDATE wallets SET
    balance = _wallet_balance + _booking.deposit_amount,
    total_earned = _wallet_earned + _booking.deposit_amount
  WHERE id = _wallet_id;
END;
$$;
