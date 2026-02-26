-- Ensure booking writes atomically lock and occupy a room to prevent double-booking
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_room_booking ON public.bookings;
CREATE TRIGGER trg_enforce_single_room_booking
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_room_booking();