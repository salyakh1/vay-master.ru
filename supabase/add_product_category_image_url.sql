-- Картинка для карточки категории товаров в фильтре поиска
ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.product_categories.image_url IS 'URL изображения для карточки категории в фильтре товаров';
