
-- Allow admins to view all bookings
CREATE POLICY "Admins can view all bookings"
ON public.bookings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any booking (for dispute resolution)
CREATE POLICY "Admins can update any booking"
ON public.bookings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles (for dispute context)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all wallets
CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update wallets (for dispute refunds)
CREATE POLICY "Admins can update any wallet"
ON public.wallets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to insert wallet transactions
CREATE POLICY "Admins can insert wallet transactions"
ON public.wallet_transactions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all wallet transactions
CREATE POLICY "Admins can view all wallet transactions"
ON public.wallet_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all receipts
CREATE POLICY "Admins can view all receipts"
ON public.receipts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
