-- ============================================
-- МИГРАЦИЯ: Система историй (Stories)
-- Истории как в Instagram: фото/видео, которые живут 24 часа
-- ============================================

-- 1. Таблица историй
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media TEXT[] NOT NULL, -- Массив URL фото/видео (максимум 4 фото или 1 видео)
  media_type TEXT NOT NULL CHECK (media_type IN ('photos', 'video')), -- Тип медиа
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, -- Автоматически через 24 часа
  views_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 2. Таблица просмотров историй (для отслеживания, кто просмотрел)
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- Один пользователь может просмотреть одну историю только один раз
  UNIQUE(story_id, viewer_id)
);

-- 3. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON public.stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_is_active ON public.stories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON public.story_views(viewer_id);

-- 4. Функция для автоматического удаления истекших историй
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS void AS $$
BEGIN
  DELETE FROM public.stories
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Триггер для автоматического установления expires_at (24 часа)
CREATE OR REPLACE FUNCTION set_story_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Если expires_at не установлен, устанавливаем на 24 часа вперед
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NEW.created_at + INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_story_expires_at
  BEFORE INSERT ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION set_story_expires_at();

-- 6. Функция для обновления счетчика просмотров
CREATE OR REPLACE FUNCTION update_story_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stories
  SET views_count = (
    SELECT COUNT(*) FROM public.story_views
    WHERE story_id = NEW.story_id
  )
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_story_views_count
  AFTER INSERT ON public.story_views
  FOR EACH ROW
  EXECUTE FUNCTION update_story_views_count();

-- 7. RLS политики
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Все могут читать активные истории
CREATE POLICY "stories_select_active" ON public.stories
  FOR SELECT USING (is_active = true AND expires_at > NOW());

-- Пользователь может создавать свои истории
CREATE POLICY "stories_insert_own" ON public.stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователь может обновлять свои истории
CREATE POLICY "stories_update_own" ON public.stories
  FOR UPDATE USING (auth.uid() = user_id);

-- Пользователь может удалять свои истории
CREATE POLICY "stories_delete_own" ON public.stories
  FOR DELETE USING (auth.uid() = user_id);

-- Все могут читать просмотры (для статистики)
CREATE POLICY "story_views_select_all" ON public.story_views
  FOR SELECT USING (true);

-- Пользователь может создавать просмотры
CREATE POLICY "story_views_insert_authenticated" ON public.story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- 8. Комментарии для документации
COMMENT ON TABLE public.stories IS 'Истории пользователей (живут 24 часа)';
COMMENT ON TABLE public.story_views IS 'Просмотры историй';
COMMENT ON COLUMN public.stories.media IS 'Массив URL медиафайлов (максимум 4 фото или 1 видео)';
COMMENT ON COLUMN public.stories.media_type IS 'Тип медиа: photos (до 4 фото) или video (1 видео до 30 сек)';
COMMENT ON COLUMN public.stories.expires_at IS 'Дата истечения истории (автоматически через 24 часа)';
