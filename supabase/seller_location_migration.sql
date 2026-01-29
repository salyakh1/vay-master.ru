-- ============================================
-- МИГРАЦИЯ: Координаты продавцов (seller_lat, seller_lng)
-- Для указания точного адреса магазина/склада
-- ============================================

-- 1. Добавляем координаты продавцов
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seller_lat DOUBLE PRECISION NULL,
  ADD COLUMN IF NOT EXISTS seller_lng DOUBLE PRECISION NULL;

-- 2. Индексы для быстрого поиска по координатам
CREATE INDEX IF NOT EXISTS idx_profiles_seller_coords ON public.profiles(seller_lat, seller_lng) 
  WHERE seller_lat IS NOT NULL AND seller_lng IS NOT NULL;

-- 3. Комментарии для документации
COMMENT ON COLUMN public.profiles.seller_lat IS 'Широта местоположения магазина/склада продавца';
COMMENT ON COLUMN public.profiles.seller_lng IS 'Долгота местоположения магазина/склада продавца';
