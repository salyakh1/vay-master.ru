-- Режим отображения Hero-баннера: split (текст слева + картинка справа) или full_image (картинка на весь блок)
-- Обязательно выполнить в Supabase SQL Editor, иначе режим «Картинка на весь блок» не сохраняется и не показывается.
ALTER TABLE ad_banners
  ADD COLUMN IF NOT EXISTS hero_layout text DEFAULT 'split' CHECK (hero_layout IN ('split', 'full_image'));

COMMENT ON COLUMN ad_banners.hero_layout IS 'Режим Hero: split — текст слева и картинка справа; full_image — картинка на весь блок';
