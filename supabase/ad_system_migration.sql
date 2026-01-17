-- ============================================
-- МИГРАЦИЯ: Расширение системы рекламы
-- Добавляет поддержку контекстной рекламы, новых типов, регионов, лимитов
-- ============================================

-- 1. Расширяем ENUM для типов рекламы
DO $$
BEGIN
  -- Добавляем новые типы, если их еще нет
  -- Проверяем существующие значения и добавляем новые
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ad_banners' 
    AND column_name = 'ad_type'
  ) THEN
    -- Создаем новую колонку ad_type с расширенными типами
    ALTER TABLE ad_banners 
    ADD COLUMN ad_type VARCHAR(50);
    
    -- Мигрируем старые типы в новые
    UPDATE ad_banners 
    SET ad_type = CASE 
      WHEN type = 'master_promo' THEN 'PROFILE_RELATED'
      WHEN type = 'product_promo' THEN 'SPONSORED_CARD'
      WHEN type = 'category_promo' THEN 'HERO_SPONSORED'
      WHEN type IN ('image', 'image_text', 'image_button') THEN 'HERO_SPONSORED'
      ELSE 'HERO_SPONSORED'
    END;
    
    -- Делаем NOT NULL после миграции
    ALTER TABLE ad_banners 
    ALTER COLUMN ad_type SET NOT NULL;
    
    -- Устанавливаем значение по умолчанию
    ALTER TABLE ad_banners 
    ALTER COLUMN ad_type SET DEFAULT 'HERO_SPONSORED';
  END IF;
END$$;

-- 2. Добавляем поля для контекстной рекламы
ALTER TABLE ad_banners
  ADD COLUMN IF NOT EXISTS category TEXT[], -- Категории товаров/услуг (например: ['roofing', 'electric'])
  ADD COLUMN IF NOT EXISTS keywords TEXT[], -- Ключевые слова для поиска
  ADD COLUMN IF NOT EXISTS regions TEXT[] DEFAULT ARRAY['ALL'], -- Регионы показа (['ALL'] = везде, ['Grozny', 'Moscow'] = конкретные города)
  ADD COLUMN IF NOT EXISTS brand_name TEXT, -- Название бренда/рекламодателя
  ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(20) DEFAULT 'fixed', -- 'fixed', 'cpc', 'cpa'
  ADD COLUMN IF NOT EXISTS price_per_click DECIMAL(10,2), -- Цена за клик (для CPC)
  ADD COLUMN IF NOT EXISTS price_per_action DECIMAL(10,2), -- Цена за действие (для CPA)
  ADD COLUMN IF NOT EXISTS fixed_price DECIMAL(10,2), -- Фиксированная цена за период
  ADD COLUMN IF NOT EXISTS impression_limit INTEGER, -- Лимит показов (NULL = без лимита)
  ADD COLUMN IF NOT EXISTS click_limit INTEGER, -- Лимит кликов (NULL = без лимита)
  ADD COLUMN IF NOT EXISTS current_impressions INTEGER DEFAULT 0, -- Текущее количество показов
  ADD COLUMN IF NOT EXISTS current_clicks INTEGER DEFAULT 0, -- Текущее количество кликов
  ADD COLUMN IF NOT EXISTS affiliate_url TEXT, -- Аффилиатная ссылка (для CPA)
  ADD COLUMN IF NOT EXISTS show_badge BOOLEAN DEFAULT true, -- Показывать бейдж "Реклама"
  ADD COLUMN IF NOT EXISTS badge_text TEXT DEFAULT 'Реклама'; -- Текст бейджа

-- 3. Обновляем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_ad_banners_ad_type ON ad_banners(ad_type);
CREATE INDEX IF NOT EXISTS idx_ad_banners_category ON ad_banners USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_ad_banners_keywords ON ad_banners USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_ad_banners_regions ON ad_banners USING GIN(regions);
CREATE INDEX IF NOT EXISTS idx_ad_banners_brand ON ad_banners(brand_name);
CREATE INDEX IF NOT EXISTS idx_ad_banners_limits ON ad_banners(impression_limit, click_limit);

-- 4. Обновляем существующие индексы для оптимизации
DROP INDEX IF EXISTS idx_ad_banners_active;
-- Индекс только со статическими условиями (проверки дат выполняются в запросах)
CREATE INDEX IF NOT EXISTS idx_ad_banners_active ON ad_banners(is_active, priority DESC, ad_type) 
  WHERE is_active = true;

-- 5. Создаем функцию для получения контекстной рекламы
CREATE OR REPLACE FUNCTION get_contextual_ads(
  p_page TEXT,
  p_category TEXT[] DEFAULT NULL,
  p_keywords TEXT[] DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_ad_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  description TEXT,
  image_url TEXT,
  ad_type VARCHAR(50),
  type VARCHAR(50),
  target_type VARCHAR(50),
  target_id UUID,
  external_url TEXT,
  pages TEXT[],
  priority INTEGER,
  category TEXT[],
  keywords TEXT[],
  regions TEXT[],
  brand_name TEXT,
  show_badge BOOLEAN,
  badge_text TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.description,
    b.image_url,
    b.ad_type,
    b.type,
    b.target_type,
    b.target_id,
    b.external_url,
    b.pages,
    b.priority,
    b.category,
    b.keywords,
    b.regions,
    b.brand_name,
    b.show_badge,
    b.badge_text,
    b.created_at
  FROM ad_banners b
  WHERE 
    b.is_active = true
    AND (b.start_date IS NULL OR b.start_date <= NOW())
    AND (b.end_date IS NULL OR b.end_date >= NOW())
    AND (b.pages IS NULL OR p_page = ANY(b.pages))
    AND (p_ad_type IS NULL OR b.ad_type = p_ad_type)
    -- Проверка лимитов
    AND (b.impression_limit IS NULL OR b.current_impressions < b.impression_limit)
    AND (b.click_limit IS NULL OR b.current_clicks < b.click_limit)
    -- Проверка региона
    AND (
      b.regions IS NULL 
      OR 'ALL' = ANY(b.regions) 
      OR (p_city IS NOT NULL AND p_city = ANY(b.regions))
    )
    -- Проверка категории (если указана)
    AND (
      b.category IS NULL 
      OR b.category = '{}'::TEXT[]
      OR (p_category IS NOT NULL AND b.category && p_category)
    )
    -- Проверка ключевых слов (если указаны)
    AND (
      b.keywords IS NULL 
      OR b.keywords = '{}'::TEXT[]
      OR (p_keywords IS NOT NULL AND b.keywords && p_keywords)
    )
  ORDER BY b.priority DESC, b.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Обновляем функцию для увеличения счетчика показов (с учетом лимитов)
-- Сначала удаляем старую функцию, если она существует (может быть с другим типом возврата)
DROP FUNCTION IF EXISTS increment_banner_views(UUID);

CREATE OR REPLACE FUNCTION increment_banner_views(banner_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_impression_limit INTEGER;
  v_current_impressions INTEGER;
BEGIN
  -- Получаем лимит и текущее количество
  SELECT impression_limit, current_impressions 
  INTO v_impression_limit, v_current_impressions
  FROM ad_banners 
  WHERE id = banner_id;
  
  -- Проверяем лимит
  IF v_impression_limit IS NOT NULL AND v_current_impressions >= v_impression_limit THEN
    RETURN false; -- Лимит достигнут
  END IF;
  
  -- Увеличиваем счетчики
  UPDATE ad_banners
  SET 
    views = views + 1,
    current_impressions = current_impressions + 1
  WHERE id = banner_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Обновляем функцию для увеличения счетчика кликов (с учетом лимитов)
-- Сначала удаляем старую функцию, если она существует (может быть с другим типом возврата)
DROP FUNCTION IF EXISTS increment_banner_clicks(UUID);

CREATE OR REPLACE FUNCTION increment_banner_clicks(banner_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_click_limit INTEGER;
  v_current_clicks INTEGER;
BEGIN
  -- Получаем лимит и текущее количество
  SELECT click_limit, current_clicks 
  INTO v_click_limit, v_current_clicks
  FROM ad_banners 
  WHERE id = banner_id;
  
  -- Проверяем лимит
  IF v_click_limit IS NOT NULL AND v_current_clicks >= v_click_limit THEN
    RETURN false; -- Лимит достигнут
  END IF;
  
  -- Увеличиваем счетчики
  UPDATE ad_banners
  SET 
    clicks = clicks + 1,
    current_clicks = current_clicks + 1
  WHERE id = banner_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Комментарии для документации
COMMENT ON COLUMN ad_banners.ad_type IS 'Тип рекламы: HERO_SPONSORED, INLINE_CONTEXT, SPONSORED_CARD, PROFILE_RELATED, FOOTER_BRAND';
COMMENT ON COLUMN ad_banners.category IS 'Категории для контекстного показа (массив)';
COMMENT ON COLUMN ad_banners.keywords IS 'Ключевые слова для контекстного показа (массив)';
COMMENT ON COLUMN ad_banners.regions IS 'Регионы показа: ["ALL"] = везде, ["Grozny", "Moscow"] = конкретные города';
COMMENT ON COLUMN ad_banners.brand_name IS 'Название бренда/рекламодателя';
COMMENT ON COLUMN ad_banners.pricing_model IS 'Модель оплаты: fixed, cpc, cpa';
COMMENT ON COLUMN ad_banners.impression_limit IS 'Лимит показов (NULL = без лимита)';
COMMENT ON COLUMN ad_banners.click_limit IS 'Лимит кликов (NULL = без лимита)';
