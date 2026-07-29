-- Allow claim status for atomic Tinkoff webhook handling (check-then-act → claim).
ALTER TABLE public.payment_sessions
  DROP CONSTRAINT IF EXISTS payment_sessions_status_check;

ALTER TABLE public.payment_sessions
  ADD CONSTRAINT payment_sessions_status_check
  CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'expired'));
