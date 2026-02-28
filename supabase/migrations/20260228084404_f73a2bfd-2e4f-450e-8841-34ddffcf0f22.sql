
-- Landlord wallet table
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_withdrawn numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = landlord_id);

CREATE POLICY "System can insert wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their own wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = landlord_id);

-- Wallet transactions table
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id),
  booking_id uuid REFERENCES public.bookings(id),
  type text NOT NULL CHECK (type IN ('deposit_release', 'withdrawal', 'refund_deduction')),
  amount numeric NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view their wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id = wallet_transactions.wallet_id AND w.landlord_id = auth.uid()
  ));

CREATE POLICY "Landlords can insert wallet transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id = wallet_transactions.wallet_id AND w.landlord_id = auth.uid()
  ));

-- Trigger to auto-update wallet updated_at
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create wallet for existing landlords who don't have one
INSERT INTO public.wallets (landlord_id)
SELECT ur.user_id FROM public.user_roles ur
WHERE ur.role = 'landlord'
ON CONFLICT (landlord_id) DO NOTHING;
