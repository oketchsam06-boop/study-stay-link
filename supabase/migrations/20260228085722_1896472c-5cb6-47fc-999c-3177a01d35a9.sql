
ALTER TABLE public.rooms
ADD COLUMN deposit_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN pricing_period text NOT NULL DEFAULT 'per_month';
