-- ============================================
-- Хранение времени последнего просмотра по типам активности
-- Используется для счётчика «новых» (непросмотренных) элементов
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity_seen (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('comments','likes','responses','reviews','followers')),
  seen_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  PRIMARY KEY (user_id, activity_type)
);

CREATE INDEX IF NOT EXISTS idx_activity_seen_user ON public.activity_seen(user_id);

ALTER TABLE public.activity_seen ENABLE ROW LEVEL SECURITY;

-- Только свой пользователь может читать/писать свои записи
DROP POLICY IF EXISTS "activity_seen_select_own" ON public.activity_seen;
CREATE POLICY "activity_seen_select_own" ON public.activity_seen
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "activity_seen_insert_own" ON public.activity_seen;
CREATE POLICY "activity_seen_insert_own" ON public.activity_seen
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "activity_seen_update_own" ON public.activity_seen;
CREATE POLICY "activity_seen_update_own" ON public.activity_seen
  FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON TABLE public.activity_seen IS 'Время последнего просмотра списков активности (комментарии, лайки, отклики, отзывы, подписки) для счётчика «новых»';
