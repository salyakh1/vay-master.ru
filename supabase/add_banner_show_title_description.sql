-- Галочки «Показывать название» и «Показывать описание» на баннере
ALTER TABLE ad_banners
  ADD COLUMN IF NOT EXISTS show_title boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_description boolean DEFAULT true;

COMMENT ON COLUMN ad_banners.show_title IS 'Показывать название (заголовок) на баннере';
COMMENT ON COLUMN ad_banners.show_description IS 'Показывать описание на баннере';
