-- ============================================
-- Добавление поля description для историй
-- ============================================

-- Добавляем поле description в таблицу stories
ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS description TEXT;

-- Комментарий для документации
COMMENT ON COLUMN public.stories.description IS 'Описание истории (текст, который отображается при просмотре)';
