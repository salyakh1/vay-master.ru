-- Воронка событий (fallback без PostHog)
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_name_created ON public.funnel_events(name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user ON public.funnel_events(user_id);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "funnel_events insert own or anon" ON public.funnel_events;
CREATE POLICY "funnel_events insert own or anon" ON public.funnel_events
  FOR INSERT WITH CHECK (
    user_id IS NULL OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "funnel_events select admin" ON public.funnel_events;
-- Чтение только через service_role / админ API
