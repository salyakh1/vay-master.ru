-- ============================================
-- МИГРАЦИЯ: Комментарии к товарам
-- Отдельная система комментариев без рейтинга
-- (в отличие от product_reviews, которые с рейтингом)
-- ============================================

-- 1. Таблица комментариев к товарам
CREATE TABLE IF NOT EXISTS public.product_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  parent_comment_id UUID REFERENCES public.product_comments(id) ON DELETE CASCADE -- Для ответов на комментарии
  -- Можно оставлять несколько комментариев к одному товару
  -- Нет UNIQUE constraint, так как это не отзывы
);

-- 2. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_product_comments_product_id ON public.product_comments(product_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_author_id ON public.product_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_parent_comment_id ON public.product_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_product_comments_created_at ON public.product_comments(created_at DESC);

-- 3. Добавляем поле для счетчика комментариев в products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- 4. Функция для обновления счетчика комментариев
CREATE OR REPLACE FUNCTION update_product_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET comments_count = (
    SELECT COUNT(*)
    FROM public.product_comments
    WHERE product_id = NEW.product_id AND parent_comment_id IS NULL -- Только основные комментарии, без ответов
  )
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Триггер для автоматического обновления счетчика
DROP TRIGGER IF EXISTS trigger_update_product_comments_count ON public.product_comments;
CREATE TRIGGER trigger_update_product_comments_count
  AFTER INSERT OR DELETE ON public.product_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_product_comments_count();

-- 6. Триггер для updated_at
CREATE TRIGGER update_product_comments_updated_at BEFORE UPDATE ON public.product_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS политики для product_comments
ALTER TABLE public.product_comments ENABLE ROW LEVEL SECURITY;

-- Все могут читать комментарии
CREATE POLICY "product_comments_select_all" ON public.product_comments
  FOR SELECT USING (true);

-- Авторизованные могут создавать комментарии
CREATE POLICY "product_comments_insert_authenticated" ON public.product_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Авторизованные могут редактировать свои комментарии
CREATE POLICY "product_comments_update_own" ON public.product_comments
  FOR UPDATE USING (auth.uid() = author_id);

-- Авторизованные могут удалять свои комментарии
CREATE POLICY "product_comments_delete_own" ON public.product_comments
  FOR DELETE USING (auth.uid() = author_id);

-- 8. Комментарии для документации
COMMENT ON TABLE public.product_comments IS 'Комментарии к товарам (без рейтинга, можно несколько от одного пользователя)';
COMMENT ON COLUMN public.product_comments.parent_comment_id IS 'ID родительского комментария для ответов (threading)';
COMMENT ON COLUMN public.products.comments_count IS 'Количество комментариев к товару (без учета ответов)';
