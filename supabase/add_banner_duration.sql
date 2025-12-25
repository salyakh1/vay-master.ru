-- Добавление поля duration (длительность показа в секундах) в таблицу ad_banners
-- По умолчанию 5 секунд (5000 мс)

ALTER TABLE ad_banners
ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 5;

COMMENT ON COLUMN ad_banners.duration IS 'Длительность показа баннера в секундах перед автоматическим переходом к следующему';

