-- ============================================
-- Orders: координаты (lat/lng) + кэш геокодинга
-- ============================================

-- 1) Колонки координат в orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS lat double precision NULL;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS lng double precision NULL;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS geocoded_at timestamptz NULL;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS geocode_label text NULL;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS geocode_source text NULL;

CREATE INDEX IF NOT EXISTS idx_orders_lat_lng ON public.orders (lat, lng);
CREATE INDEX IF NOT EXISTS idx_orders_geocoded_at ON public.orders (geocoded_at);

-- 2) Таблица кэша геокодинга (query -> lat/lng)
CREATE TABLE IF NOT EXISTS public.geocoding_cache (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  query text NOT NULL UNIQUE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  label text,
  source text NOT NULL DEFAULT 'nominatim',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geocoding_cache_query ON public.geocoding_cache (query);

-- updated_at trigger (если функция уже есть в schema.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'update_geocoding_cache_updated_at'
    ) THEN
      CREATE TRIGGER update_geocoding_cache_updated_at
      BEFORE UPDATE ON public.geocoding_cache
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;

-- RLS: закрываем таблицу кэша от клиентских запросов (только service role / backend)
ALTER TABLE public.geocoding_cache ENABLE ROW LEVEL SECURITY;

