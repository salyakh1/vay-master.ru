-- ============================================
-- МИГРАЦИЯ: Система отзывов и рейтингов
-- Отзывы могут оставлять все пользователи
-- Отзывы к мастерам, продавцам и товарам
-- Возможность ответа на отзывы
-- Рейтинг от 1 до 5 звезд
-- ============================================

-- 1. Таблица отзывов о мастерах
CREATE TABLE IF NOT EXISTS public.master_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  master_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- Один пользователь может оставить один отзыв на одного мастера
  UNIQUE(master_id, reviewer_id),
  -- Нельзя оставить отзыв самому себе
  CHECK (master_id != reviewer_id)
);

-- 2. Таблица отзывов о товарах
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- Один пользователь может оставить один отзыв на один товар
  UNIQUE(product_id, reviewer_id),
  -- Нельзя оставить отзыв на свой товар
  CHECK (seller_id != reviewer_id)
);

-- 3. Таблица ответов на отзывы (для всех типов отзывов)
CREATE TABLE IF NOT EXISTS public.review_replies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id UUID NOT NULL, -- ID отзыва (может быть из master_reviews или product_reviews)
  review_type TEXT NOT NULL CHECK (review_type IN ('master', 'product')),
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_master_reviews_master_id ON public.master_reviews(master_id);
CREATE INDEX IF NOT EXISTS idx_master_reviews_reviewer_id ON public.master_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_master_reviews_rating ON public.master_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_master_reviews_created_at ON public.master_reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_seller_id ON public.product_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_reviewer_id ON public.product_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON public.review_replies(review_id, review_type);
CREATE INDEX IF NOT EXISTS idx_review_replies_author_id ON public.review_replies(author_id);

-- 5. Добавляем поля для агрегированного рейтинга в profiles (опционально, для быстрого доступа)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS master_rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS master_reviews_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_reviews_count INTEGER DEFAULT 0;

-- 6. Добавляем поле для рейтинга товаров
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- 7. Функция для обновления рейтинга мастера
CREATE OR REPLACE FUNCTION update_master_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    master_rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
      FROM public.master_reviews
      WHERE master_id = NEW.master_id
    ),
    master_reviews_count = (
      SELECT COUNT(*)
      FROM public.master_reviews
      WHERE master_id = NEW.master_id
    )
  WHERE id = NEW.master_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Функция для обновления рейтинга продавца (на основе отзывов о товарах)
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    seller_rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
      FROM public.product_reviews
      WHERE seller_id = NEW.seller_id
    ),
    seller_reviews_count = (
      SELECT COUNT(*)
      FROM public.product_reviews
      WHERE seller_id = NEW.seller_id
    )
  WHERE id = NEW.seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Функция для обновления рейтинга товара
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET 
    rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
      FROM public.product_reviews
      WHERE product_id = NEW.product_id
    ),
    reviews_count = (
      SELECT COUNT(*)
      FROM public.product_reviews
      WHERE product_id = NEW.product_id
    )
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Триггеры для автоматического обновления рейтингов
DROP TRIGGER IF EXISTS trigger_update_master_rating_insert ON public.master_reviews;
CREATE TRIGGER trigger_update_master_rating_insert
  AFTER INSERT OR UPDATE OR DELETE ON public.master_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_master_rating();

DROP TRIGGER IF EXISTS trigger_update_seller_rating_insert ON public.product_reviews;
CREATE TRIGGER trigger_update_seller_rating_insert
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_rating();

DROP TRIGGER IF EXISTS trigger_update_product_rating_insert ON public.product_reviews;
CREATE TRIGGER trigger_update_product_rating_insert
  AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

-- 11. Функция для обновления updated_at (если еще не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Триггер для updated_at
CREATE TRIGGER update_master_reviews_updated_at BEFORE UPDATE ON public.master_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_replies_updated_at BEFORE UPDATE ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. RLS политики
ALTER TABLE public.master_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

-- Политики для master_reviews: все могут читать, авторизованные могут создавать/редактировать свои
CREATE POLICY "master_reviews_select_all" ON public.master_reviews
  FOR SELECT USING (true);

CREATE POLICY "master_reviews_insert_authenticated" ON public.master_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "master_reviews_update_own" ON public.master_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "master_reviews_delete_own" ON public.master_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- Политики для product_reviews: все могут читать, авторизованные могут создавать/редактировать свои
CREATE POLICY "product_reviews_select_all" ON public.product_reviews
  FOR SELECT USING (true);

CREATE POLICY "product_reviews_insert_authenticated" ON public.product_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "product_reviews_update_own" ON public.product_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "product_reviews_delete_own" ON public.product_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- Политики для review_replies: все могут читать, авторизованные могут создавать свои
CREATE POLICY "review_replies_select_all" ON public.review_replies
  FOR SELECT USING (true);

CREATE POLICY "review_replies_insert_authenticated" ON public.review_replies
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "review_replies_update_own" ON public.review_replies
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "review_replies_delete_own" ON public.review_replies
  FOR DELETE USING (auth.uid() = author_id);

-- 14. Комментарии для документации
COMMENT ON TABLE public.master_reviews IS 'Отзывы о мастерах от любых пользователей';
COMMENT ON TABLE public.product_reviews IS 'Отзывы о товарах от любых пользователей';
COMMENT ON TABLE public.review_replies IS 'Ответы на отзывы (могут оставлять авторы отзывов и владельцы)';
COMMENT ON COLUMN public.profiles.master_rating IS 'Средний рейтинг мастера (рассчитывается автоматически)';
COMMENT ON COLUMN public.profiles.master_reviews_count IS 'Количество отзывов о мастере';
COMMENT ON COLUMN public.profiles.seller_rating IS 'Средний рейтинг продавца (на основе отзывов о товарах)';
COMMENT ON COLUMN public.profiles.seller_reviews_count IS 'Количество отзывов о продавце';
COMMENT ON COLUMN public.products.rating IS 'Средний рейтинг товара (рассчитывается автоматически)';
COMMENT ON COLUMN public.products.reviews_count IS 'Количество отзывов о товаре';
