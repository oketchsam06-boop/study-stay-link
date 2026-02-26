-- Backfill room occupancy from existing bookings to correct stale vacancy flags
UPDATE public.rooms r
SET is_vacant = false
WHERE EXISTS (
  SELECT 1
  FROM public.bookings b
  WHERE b.room_id = r.id
);