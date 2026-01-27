-- Product categories catalog (v2)
-- Sections: construction, exterior, engineering, finishing, tools, auto

-- Update existing constraint if table already exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'product_categories_section_check'
    AND table_name = 'product_categories'
  ) THEN
    ALTER TABLE public.product_categories DROP CONSTRAINT product_categories_section_check;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (section, name),
  UNIQUE (slug)
);

-- Add updated constraint with new sections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'product_categories_section_check'
    AND table_name = 'product_categories'
  ) THEN
    ALTER TABLE public.product_categories
    ADD CONSTRAINT product_categories_section_check
    CHECK (section IN ('construction', 'exterior', 'engineering', 'finishing', 'tools', 'auto'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_product_categories_section ON public.product_categories(section);

-- Subcategories
CREATE TABLE IF NOT EXISTS public.product_subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (category_id, name),
  UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_product_subcategories_category_id ON public.product_subcategories(category_id);

-- Link products to categories/subcategories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'subcategory_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN subcategory_id UUID REFERENCES public.product_subcategories(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);

-- Seller preferences (categories and subcategories)
CREATE TABLE IF NOT EXISTS public.profile_product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (profile_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.profile_product_subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES public.product_subcategories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (profile_id, subcategory_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_product_categories_profile ON public.profile_product_categories(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_product_subcategories_profile ON public.profile_product_subcategories(profile_id);

-- RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_product_subcategories ENABLE ROW LEVEL SECURITY;

-- Policies: reference data is readable by everyone
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'product_categories select all') THEN
    CREATE POLICY "product_categories select all" ON public.product_categories
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_subcategories' AND policyname = 'product_subcategories select all') THEN
    CREATE POLICY "product_subcategories select all" ON public.product_subcategories
      FOR SELECT USING (true);
  END IF;
END$$;

-- Policies: sellers manage only their own selections
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_product_categories' AND policyname = 'profile_product_categories select all') THEN
    CREATE POLICY "profile_product_categories select all" ON public.profile_product_categories
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_product_categories' AND policyname = 'profile_product_categories insert own') THEN
    CREATE POLICY "profile_product_categories insert own" ON public.profile_product_categories
      FOR INSERT WITH CHECK (auth.uid() = profile_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_product_categories' AND policyname = 'profile_product_categories delete own') THEN
    CREATE POLICY "profile_product_categories delete own" ON public.profile_product_categories
      FOR DELETE USING (auth.uid() = profile_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_product_subcategories' AND policyname = 'profile_product_subcategories select all') THEN
    CREATE POLICY "profile_product_subcategories select all" ON public.profile_product_subcategories
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_product_subcategories' AND policyname = 'profile_product_subcategories insert own') THEN
    CREATE POLICY "profile_product_subcategories insert own" ON public.profile_product_subcategories
      FOR INSERT WITH CHECK (auth.uid() = profile_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profile_product_subcategories' AND policyname = 'profile_product_subcategories delete own') THEN
    CREATE POLICY "profile_product_subcategories delete own" ON public.profile_product_subcategories
      FOR DELETE USING (auth.uid() = profile_id);
  END IF;
END$$;

-- Optional: prevent inserts/updates of reference data from anon users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'product_categories insert service_role') THEN
    CREATE POLICY "product_categories insert service_role" ON public.product_categories
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_subcategories' AND policyname = 'product_subcategories insert service_role') THEN
    CREATE POLICY "product_subcategories insert service_role" ON public.product_subcategories
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;

-- Seed: top-level categories
INSERT INTO public.product_categories (section, name, slug)
VALUES
  ('exterior','Кровля и водостоки','roofing-gutters'),
  ('exterior','Фасады и облицовка','facades-cladding'),
  ('exterior','Утеплители и изоляция','insulation'),
  ('exterior','Гидроизоляция и герметики','waterproofing-sealants'),
  ('exterior','Заборы, ворота, ограждения','fences-gates'),
  ('exterior','Благоустройство и ландшафт','landscaping-outdoor'),
  ('construction','Строительные смеси','building-mixes'),
  ('construction','Сыпучие материалы','bulk-materials'),
  ('construction','Кирпич, блоки, ЖБИ','masonry-blocks-jbi'),
  ('construction','Пиломатериалы и листовые материалы','lumber-panels'),
  ('construction','Металлоконструкции и сварка (материалы)','metalworks-welding-materials'),
  ('tools','Крепеж и метизы','fasteners-hardware'),
  ('tools','Инструменты электро','power-tools'),
  ('tools','Инструменты ручные','hand-tools'),
  ('tools','Расходники и оснастка','consumables-accessories'),
  ('engineering','Сантехника и водоснабжение','plumbing-water-supply'),
  ('engineering','Канализация и септики','sewer-septic'),
  ('engineering','Отопление и котельное','heating-boilers'),
  ('engineering','Вентиляция и кондиционирование','ventilation-ac'),
  ('engineering','Электрика и освещение','electrical-lighting'),
  ('engineering','Слаботочка и умный дом','low-voltage-smart-home'),
  ('finishing','Окна, двери, фурнитура','windows-doors-hardware'),
  ('finishing','Отделочные материалы','finishing-materials'),
  ('finishing','Полы и напольные покрытия','flooring'),
  ('finishing','Плитка и камень','tile-stone'),
  ('finishing','Мебель, кухонные комплектующие, фурнитура','furniture-kitchen-hardware'),
  ('auto','Автозапчасти: двигатель/КПП','auto-parts-engine-gearbox'),
  ('auto','Автозапчасти: ходовая/тормоза','auto-parts-suspension-brakes'),
  ('auto','Автоэлектрика и электроника','auto-electronics'),
  ('auto','Автохимия, масла, детейлинг','auto-chemicals-detailing')
ON CONFLICT DO NOTHING;
-- Product categories catalog (v2)
-- Sections: construction, exterior, engineering, finishing, tools, auto

-- Update existing constraint if table already exists
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'product_categories_section_check' 
    AND table_name = 'product_categories'
  ) THEN
    ALTER TABLE public.product_categories DROP CONSTRAINT product_categories_section_check;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (section, name),
  UNIQUE (slug)
);

-- Add updated constraint with new sections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'product_categories_section_check' 
    AND table_name = 'product_categories'
  ) THEN
    ALTER TABLE public.product_categories 
    ADD CONSTRAINT product_categories_section_check 
    CHECK (section IN ('construction', 'exterior', 'engineering', 'finishing', 'tools', 'auto'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_product_categories_section ON public.product_categories(section);

-- Link products to categories (optional, keep legacy category text)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Policies: read for all, write via service_role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'product_categories select all') THEN
    CREATE POLICY "product_categories select all" ON public.product_categories
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'product_categories insert service_role') THEN
    CREATE POLICY "product_categories insert service_role" ON public.product_categories
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'product_categories update service_role') THEN
    CREATE POLICY "product_categories update service_role" ON public.product_categories
      FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_categories' AND policyname = 'product_categories delete service_role') THEN
    CREATE POLICY "product_categories delete service_role" ON public.product_categories
      FOR DELETE USING (auth.role() = 'service_role');
  END IF;
END$$;

-- Optional: replace existing catalog with new list
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product_categories'
  ) THEN
    DELETE FROM public.product_categories;
  END IF;
END$$;

-- Seed: new unified catalog
INSERT INTO public.product_categories (section, name, slug)
VALUES
  -- Exterior
  ('exterior','Кровля и водостоки','roofing-gutters'),
  ('exterior','Фасады и облицовка','facades-cladding'),
  ('exterior','Утеплители и изоляция','insulation'),
  ('exterior','Гидроизоляция и герметики','waterproofing-sealants'),
  ('exterior','Заборы, ворота, ограждения','fences-gates'),
  ('exterior','Благоустройство и ландшафт','landscaping-outdoor'),
  -- Construction
  ('construction','Строительные смеси','building-mixes'),
  ('construction','Сыпучие материалы','bulk-materials'),
  ('construction','Кирпич, блоки, ЖБИ','masonry-blocks-jbi'),
  ('construction','Пиломатериалы и листовые материалы','lumber-panels'),
  ('construction','Металлоконструкции и сварка (материалы)','metalworks-welding-materials'),
  -- Tools
  ('tools','Крепеж и метизы','fasteners-hardware'),
  ('tools','Инструменты электро','power-tools'),
  ('tools','Инструменты ручные','hand-tools'),
  ('tools','Расходники и оснастка','consumables-accessories'),
  -- Engineering
  ('engineering','Сантехника и водоснабжение','plumbing-water-supply'),
  ('engineering','Канализация и септики','sewer-septic'),
  ('engineering','Отопление и котельное','heating-boilers'),
  ('engineering','Вентиляция и кондиционирование','ventilation-ac'),
  ('engineering','Электрика и освещение','electrical-lighting'),
  ('engineering','Слаботочка и умный дом','low-voltage-smart-home'),
  -- Finishing
  ('finishing','Окна, двери, фурнитура','windows-doors-hardware'),
  ('finishing','Отделочные материалы','finishing-materials'),
  ('finishing','Полы и напольные покрытия','flooring'),
  ('finishing','Плитка и камень','tile-stone'),
  ('finishing','Мебель, кухонные комплектующие, фурнитура','furniture-kitchen-hardware'),
  -- Auto
  ('auto','Автозапчасти: двигатель/КПП','auto-parts-engine-gearbox'),
  ('auto','Автозапчасти: ходовая/тормоза','auto-parts-suspension-brakes'),
  ('auto','Автоэлектрика и электроника','auto-electronics'),
  ('auto','Автохимия, масла, детейлинг','auto-chemicals-detailing')
ON CONFLICT DO NOTHING;


