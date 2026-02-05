-- Картинка для карточки специализации (индивидуальная, без дублирования)
ALTER TABLE public.specializations
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.specializations.image_url IS 'URL изображения для карточки специализации на главной';
