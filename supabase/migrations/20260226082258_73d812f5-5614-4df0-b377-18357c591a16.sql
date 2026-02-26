
-- Drop the restrictive SELECT policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view hostels" ON public.hostels;
CREATE POLICY "Anyone can view hostels"
ON public.hostels
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
CREATE POLICY "Anyone can view rooms"
ON public.rooms
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Anyone can view verified plots" ON public.verified_plots;
CREATE POLICY "Anyone can view verified plots"
ON public.verified_plots
FOR SELECT
TO public
USING (true);
