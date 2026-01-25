-- ============================================
-- МИГРАЦИЯ: Прямые отзывы о продавцах
-- Аналогично master_reviews, но для продавцов
-- ============================================

-- 1. Таблица прямых отзывов о продавцах
CREATE TABLE IF NOT EXISTS public.seller_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- Один пользователь может оставить один отзыв на одного продавца
  UNIQUE(seller_id, reviewer_id),
  -- Нельзя оставить отзыв самому себе
  CHECK (seller_id != reviewer_id)
);

-- 2. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller_id ON public.seller_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_reviewer_id ON public.seller_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_rating ON public.seller_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_created_at ON public.seller_reviews(created_at DESC);

-- 3. Обновляем функцию для расчета рейтинга продавца (теперь учитываем и прямые отзывы, и отзывы о товарах)
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_id UUID;
BEGIN
  -- Определяем seller_id в зависимости от таблицы
  IF TG_TABLE_NAME = 'seller_reviews' THEN
    v_seller_id := NEW.seller_id;
  ELSIF TG_TABLE_NAME = 'product_reviews' THEN
    v_seller_id := NEW.seller_id;
  ELSE
    RETURN NULL;
  END IF;

  -- Обновляем рейтинг продавца на основе:
  -- 1. Прямых отзывов о продавце (seller_reviews)
  -- 2. Отзывов о товарах продавца (product_reviews)
  UPDATE public.profiles
  SET 
    seller_rating = (
      SELECT COALESCE(
        (
          -- Средний рейтинг из прямых отзывов о продавце
          (SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0) * COUNT(*) FROM public.seller_reviews WHERE seller_id = v_seller_id) +
          -- Средний рейтинг из отзывов о товарах
          (SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0) * COUNT(*) FROM public.product_reviews WHERE seller_id = v_seller_id)
        ) / NULLIF(
          (SELECT COUNT(*) FROM public.seller_reviews WHERE seller_id = v_seller_id) +
          (SELECT COUNT(*) FROM public.product_reviews WHERE seller_id = v_seller_id),
          0
        ),
        0
      )
    ),
    seller_reviews_count = (
      (SELECT COUNT(*) FROM public.seller_reviews WHERE seller_id = v_seller_id) +
      (SELECT COUNT(*) FROM public.product_reviews WHERE seller_id = v_seller_id)
    )
  WHERE id = v_seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Триггер для автоматического обновления рейтинга при изменении прямых отзывов о продавце
DROP TRIGGER IF EXISTS trigger_update_seller_rating_from_seller_reviews ON public.seller_reviews;
CREATE TRIGGER trigger_update_seller_rating_from_seller_reviews
  AFTER INSERT OR UPDATE OR DELETE ON public.seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_rating();

-- 5. Обновляем существующий триггер для product_reviews (он уже есть, но функция обновлена)
DROP TRIGGER IF EXISTS trigger_update_seller_rating_insert ON public.product_reviews;
CREATE TRIGGER trigger_update_seller_rating_insert
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_rating();

-- 6. Триггер для updated_at
CREATE TRIGGER update_seller_reviews_updated_at BEFORE UPDATE ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Обновляем review_replies для поддержки seller_reviews
ALTER TABLE public.review_replies
  DROP CONSTRAINT IF EXISTS review_replies_review_type_check;
  
ALTER TABLE public.review_replies
  ADD CONSTRAINT review_replies_review_type_check 
  CHECK (review_type IN ('master', 'product', 'seller'));

-- 8. RLS политики для seller_reviews
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

-- Все могут читать отзывы о продавцах
CREATE POLICY "seller_reviews_select_all" ON public.seller_reviews
  FOR SELECT USING (true);

-- Авторизованные могут создавать отзывы
CREATE POLICY "seller_reviews_insert_authenticated" ON public.seller_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Авторизованные могут редактировать свои отзывы
CREATE POLICY "seller_reviews_update_own" ON public.seller_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- Авторизованные могут удалять свои отзывы
CREATE POLICY "seller_reviews_delete_own" ON public.seller_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- 9. Комментарии для документации
COMMENT ON TABLE public.seller_reviews IS 'Прямые отзывы о продавцах от любых пользователей (аналогично master_reviews)';
COMMENT ON COLUMN public.profiles.seller_rating IS 'Средний рейтинг продавца (рассчитывается из прямых отзывов + отзывов о товарах)';
COMMENT ON COLUMN public.profiles.seller_reviews_count IS 'Количество отзывов о продавце (прямые + через товары)';
