-- ============================================
-- ОБНОВЛЕНИЕ РЕЙТИНГОВ И СЧЕТЧИКОВ ОТЗЫВОВ
-- Синхронизация данных в таблице profiles и products
-- ============================================

-- 1. Обновление рейтингов и счетчиков отзывов для мастеров
UPDATE public.profiles
SET 
  master_rating = COALESCE((
    SELECT AVG(rating)::DECIMAL(3,2)
    FROM public.master_reviews
    WHERE master_id = profiles.id
  ), 0),
  master_reviews_count = COALESCE((
    SELECT COUNT(*)
    FROM public.master_reviews
    WHERE master_id = profiles.id
  ), 0)
WHERE role = 'master';

-- 2. Обновление рейтингов и счетчиков отзывов для продавцов
-- (из прямых отзывов о продавце + отзывов о товарах)
UPDATE public.profiles
SET 
  seller_rating = (
    SELECT COALESCE(
      (
        -- Средний рейтинг из прямых отзывов о продавце
        (SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0) * COUNT(*) FROM public.seller_reviews WHERE seller_id = profiles.id) +
        -- Средний рейтинг из отзывов о товарах
        (SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0) * COUNT(*) FROM public.product_reviews WHERE seller_id = profiles.id)
      ) / NULLIF(
        (SELECT COUNT(*) FROM public.seller_reviews WHERE seller_id = profiles.id) +
        (SELECT COUNT(*) FROM public.product_reviews WHERE seller_id = profiles.id),
        0
      ),
      0
    )
  ),
  seller_reviews_count = (
    (SELECT COUNT(*) FROM public.seller_reviews WHERE seller_id = profiles.id) +
    (SELECT COUNT(*) FROM public.product_reviews WHERE seller_id = profiles.id)
  )
WHERE role = 'seller';

-- 3. Обновление рейтингов и счетчиков отзывов для товаров
UPDATE public.products
SET 
  rating = COALESCE((
    SELECT AVG(rating)::DECIMAL(3,2)
    FROM public.product_reviews
    WHERE product_id = products.id
  ), 0),
  reviews_count = COALESCE((
    SELECT COUNT(*)
    FROM public.product_reviews
    WHERE product_id = products.id
  ), 0);

-- 4. Проверка результатов
SELECT 
  'Мастера' as type,
  COUNT(*) as total,
  COUNT(CASE WHEN master_reviews_count > 0 THEN 1 END) as with_reviews,
  AVG(master_rating) as avg_rating
FROM public.profiles
WHERE role = 'master'

UNION ALL

SELECT 
  'Продавцы' as type,
  COUNT(*) as total,
  COUNT(CASE WHEN seller_reviews_count > 0 THEN 1 END) as with_reviews,
  AVG(seller_rating) as avg_rating
FROM public.profiles
WHERE role = 'seller'

UNION ALL

SELECT 
  'Товары' as type,
  COUNT(*) as total,
  COUNT(CASE WHEN reviews_count > 0 THEN 1 END) as with_reviews,
  AVG(rating) as avg_rating
FROM public.products;
