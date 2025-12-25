-- Таблица для рекламных баннеров
CREATE TABLE IF NOT EXISTS ad_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'image', -- 'image', 'image_text', 'image_button', 'master_promo', 'product_promo', 'category_promo'
  target_type VARCHAR(50), -- 'master', 'product', 'category', 'order', 'external_url', null
  target_id UUID, -- ID мастера, товара, категории, заказа
  external_url TEXT, -- Внешний URL, если target_type = 'external_url'
  pages TEXT[] NOT NULL DEFAULT '{}', -- Массив страниц: ['home', 'search', 'orders', 'products', 'feed']
  priority INTEGER NOT NULL DEFAULT 0, -- Приоритет показа (больше = выше)
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  views INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_ad_banners_pages ON ad_banners USING GIN(pages);
CREATE INDEX IF NOT EXISTS idx_ad_banners_active ON ad_banners(is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_ad_banners_dates ON ad_banners(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_banners_type ON ad_banners(type);

-- RLS политики
ALTER TABLE ad_banners ENABLE ROW LEVEL SECURITY;

-- Все могут читать активные баннеры
CREATE POLICY "Anyone can view active banners"
  ON ad_banners
  FOR SELECT
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
  );

-- Только админы могут создавать/обновлять/удалять
-- Используем RPC функцию для проверки админ-роли, чтобы избежать рекурсии
CREATE POLICY "Admins can manage banners"
  ON ad_banners
  FOR ALL
  USING (
    (SELECT is_admin(auth.uid())) = true
  )
  WITH CHECK (
    (SELECT is_admin(auth.uid())) = true
  );

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_ad_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ad_banners_updated_at
  BEFORE UPDATE ON ad_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_banners_updated_at();

-- Функция для увеличения счетчика просмотров
CREATE OR REPLACE FUNCTION increment_banner_views(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ad_banners
  SET views = views + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для увеличения счетчика кликов
CREATE OR REPLACE FUNCTION increment_banner_clicks(banner_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE ad_banners
  SET clicks = clicks + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

