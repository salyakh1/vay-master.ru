-- Сессии оплаты до создания заказа (Тинькофф). Выполнить в Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'order_publication',
  payload JSONB NOT NULL,
  amount_kopecks INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'expired')),
  tinkoff_payment_id TEXT,
  created_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON public.payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_status ON public.payment_sessions(status);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

-- Только service role (API routes) — политики для anon не нужны

COMMENT ON TABLE public.payment_sessions IS 'Предоплатные сессии: payload заказа до оплаты через Тинькофф';
