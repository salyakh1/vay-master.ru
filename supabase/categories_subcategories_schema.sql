-- ============================================
-- ЭТАП 1 ПЛАНА: Схема БД — категории → подкатегории → услуги
-- ============================================
-- КАТЕГОРИИ → ПОДКАТЕГОРИИ → УСЛУГИ (3 уровня)
-- Выполни в Supabase SQL Editor один раз.
-- Если в БД ещё есть specializations/services — скрипт сам их удалит и создаст новую структуру.
--
-- 1. Удаляем старые таблицы (порядок из-за FK)
-- 2. Создаём categories, subcategories, services, profile_subcategories, profile_services
-- 3. order_category_specialization переводим на category_id
-- ============================================

-- Удаление старых таблиц (если есть)
DROP TABLE IF EXISTS public.profile_services CASCADE;
DROP TABLE IF EXISTS public.profile_specializations CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.specializations CASCADE;

-- Маппинг заказов: пересоздаём с category_id (таблицу order_category_specialization обновим отдельно, если она уже есть)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_category_specialization') THEN
    DROP TABLE public.order_category_specialization CASCADE;
  END IF;
END$$;

-- 1. Категории (верхний уровень)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Подкатегории (привязаны к категории)
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (category_id, slug)
);

CREATE INDEX idx_subcategories_category ON public.subcategories(category_id);

-- 3. Услуги (привязаны к подкатегории)
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (subcategory_id, slug)
);

CREATE INDEX idx_services_subcategory ON public.services(subcategory_id);

-- 4. Привязки мастера к подкатегориям
CREATE TABLE public.profile_subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (profile_id, subcategory_id)
);

CREATE INDEX idx_profile_subcategories_profile ON public.profile_subcategories(profile_id);
CREATE INDEX idx_profile_subcategories_subcategory ON public.profile_subcategories(subcategory_id);

-- 5. Привязки мастера к услугам
CREATE TABLE public.profile_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price NUMERIC(12, 2) NULL,
  price_unit TEXT NULL CHECK (price_unit IS NULL OR price_unit IN ('m', 'm2', 'm3')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (profile_id, service_id),
  CONSTRAINT profile_services_price_nonneg CHECK (price IS NULL OR price >= 0)
);

CREATE INDEX idx_profile_services_profile ON public.profile_services(profile_id);

-- 6. Маппинг категории заказа → категория (для уведомлений мастеров)
CREATE TABLE public.order_category_specialization (
  order_category TEXT PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.order_category_specialization IS 'Маппинг категорий заказов на категории мастеров (для уведомлений)';

-- RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_services ENABLE ROW LEVEL SECURITY;

-- Политики: справочники — чтение всем (идемпотентно)
DROP POLICY IF EXISTS "categories select all" ON public.categories;
CREATE POLICY "categories select all" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "subcategories select all" ON public.subcategories;
CREATE POLICY "subcategories select all" ON public.subcategories FOR SELECT USING (true);
DROP POLICY IF EXISTS "services select all" ON public.services;
CREATE POLICY "services select all" ON public.services FOR SELECT USING (true);

-- Политики: мастера управляют своими привязками
DROP POLICY IF EXISTS "profile_subcategories select all" ON public.profile_subcategories;
CREATE POLICY "profile_subcategories select all" ON public.profile_subcategories FOR SELECT USING (true);
DROP POLICY IF EXISTS "profile_subcategories insert own" ON public.profile_subcategories;
CREATE POLICY "profile_subcategories insert own" ON public.profile_subcategories FOR INSERT WITH CHECK (auth.uid() = profile_id);
DROP POLICY IF EXISTS "profile_subcategories delete own" ON public.profile_subcategories;
CREATE POLICY "profile_subcategories delete own" ON public.profile_subcategories FOR DELETE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "profile_services select all" ON public.profile_services;
CREATE POLICY "profile_services select all" ON public.profile_services FOR SELECT USING (true);
DROP POLICY IF EXISTS "profile_services insert own" ON public.profile_services;
CREATE POLICY "profile_services insert own" ON public.profile_services FOR INSERT WITH CHECK (auth.uid() = profile_id);
DROP POLICY IF EXISTS "profile_services delete own" ON public.profile_services;
CREATE POLICY "profile_services delete own" ON public.profile_services FOR DELETE USING (auth.uid() = profile_id);
DROP POLICY IF EXISTS "profile_services update own" ON public.profile_services;
CREATE POLICY "profile_services update own" ON public.profile_services FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- Вставка справочников — только service_role (сиды/админ)
DROP POLICY IF EXISTS "categories insert service_role" ON public.categories;
CREATE POLICY "categories insert service_role" ON public.categories FOR INSERT WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "subcategories insert service_role" ON public.subcategories;
CREATE POLICY "subcategories insert service_role" ON public.subcategories FOR INSERT WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "services insert service_role" ON public.services;
CREATE POLICY "services insert service_role" ON public.services FOR INSERT WITH CHECK (auth.role() = 'service_role');
