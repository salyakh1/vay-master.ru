-- Product categories catalog
-- Sections: instruments, autoparts, materials

CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section TEXT NOT NULL CHECK (section IN ('instruments', 'autoparts', 'materials')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (section, name),
  UNIQUE (slug)
);

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

-- Seed: instruments (from screenshot)
INSERT INTO public.product_categories (section, name, slug)
VALUES
  ('instruments','Аккумуляторный инструмент','instruments-cordless'),
  ('instruments','Болгарки (УШМ)','instruments-angle-grinders'),
  ('instruments','Бороздоделы (штроборезы)','instruments-wall-chasers'),
  ('instruments','Гайковёрты','instruments-impact-wrenches'),
  ('instruments','Гвоздезабиватели (степлеры)','instruments-nailers'),
  ('instruments','Генераторы (электростанции)','instruments-generators'),
  ('instruments','Граверы','instruments-engravers'),
  ('instruments','Дрели','instruments-drills'),
  ('instruments','Заклёпочники','instruments-rivet-guns'),
  ('instruments','Измерительный инструмент','instruments-measuring'),
  ('instruments','Инструмент и оборудование по видам работ','instruments-by-work'),
  ('instruments','Инструментальные наборы','instruments-kits'),
  ('instruments','Клуппы электрические','instruments-electric-threaders'),
  ('instruments','Компрессоры','instruments-compressors'),
  ('instruments','Краскопульты','instruments-spray-guns'),
  ('instruments','Лабораторное оборудование','instruments-lab'),
  ('instruments','Лобзики','instruments-jigsaws'),
  ('instruments','Ножницы по металлу','instruments-metal-shears'),
  ('instruments','Отбойные молотки','instruments-breakers'),
  ('instruments','Паяльное оборудование','instruments-soldering'),
  ('instruments','Перфораторы','instruments-rotary-hammers'),
  ('instruments','Пилы','instruments-saws'),
  ('instruments','Пистолеты','instruments-guns'),
  ('instruments','Пневмоинструмент','instruments-pneumatic'),
  ('instruments','Пневмоподготовка воздуха','instruments-air-prep'),
  ('instruments','Пневмошуруповёрты','instruments-pneumatic-screwdrivers'),
  ('instruments','Расходные материалы','instruments-consumables'),
  ('instruments','Реноваторы многофункциональные','instruments-multitools'),
  ('instruments','Сварочное оборудование','instruments-welding'),
  ('instruments','Силовая техника','instruments-power-equipment'),
  ('instruments','Строительные пылесосы','instruments-vacuums'),
  ('instruments','Фены (термопистолеты)','instruments-heat-guns'),
  ('instruments','Фидеры винтов','instruments-screw-feeders'),
  ('instruments','Фрезеры','instruments-routers'),
  ('instruments','Шлифмашины','instruments-sanders'),
  ('instruments','Шуруповёрты','instruments-screwdrivers'),
  ('instruments','Электрические отвёртки','instruments-electric-screwdrivers'),
  ('instruments','Электрорубанки','instruments-planers')
ON CONFLICT DO NOTHING;

-- Seed: autoparts
INSERT INTO public.product_categories (section, name, slug)
VALUES
  ('autoparts','Двигатель и ГРМ','autoparts-engine'),
  ('autoparts','Трансмиссия','autoparts-transmission'),
  ('autoparts','Топливная система','autoparts-fuel'),
  ('autoparts','Охлаждение и отопление','autoparts-cooling-heating'),
  ('autoparts','Выхлоп','autoparts-exhaust'),
  ('autoparts','Подвеска','autoparts-suspension'),
  ('autoparts','Тормозная система','autoparts-brakes'),
  ('autoparts','Рулевое управление','autoparts-steering'),
  ('autoparts','Электрика и свет','autoparts-electric'),
  ('autoparts','Кузов и оптика','autoparts-body'),
  ('autoparts','Салон и интерьер','autoparts-interior'),
  ('autoparts','Климат','autoparts-climate'),
  ('autoparts','Фильтры и расходники','autoparts-filters'),
  ('autoparts','Ремни/цепи/ролики','autoparts-belts'),
  ('autoparts','Шины и диски','autoparts-wheels'),
  ('autoparts','Жидкости и автохимия','autoparts-fluids'),
  ('autoparts','Аксессуары','autoparts-accessories'),
  ('autoparts','ЭРА-ГЛОНАСС и мультимедиа','autoparts-multimedia')
ON CONFLICT DO NOTHING;

-- Seed: construction materials
INSERT INTO public.product_categories (section, name, slug)
VALUES
  ('materials','Сыпучие (песок, щебень, керамзит)','materials-bulk'),
  ('materials','Вяжущие и сухие смеси','materials-binders'),
  ('materials','Кирпич и блоки','materials-bricks-blocks'),
  ('materials','Бетон и ЖБИ','materials-concrete'),
  ('materials','Деревоматериалы и листы','materials-wood-panels'),
  ('materials','Кровля (шифер, металлочерепица, профнастил)','materials-roofing'),
  ('materials','Утеплители','materials-insulation'),
  ('materials','Паро- и гидроизоляция','materials-waterproofing'),
  ('materials','Сайдинг и фасад','materials-siding'),
  ('materials','Окна, двери, подоконники','materials-windows-doors'),
  ('materials','Полы (стяжки, покрытия)','materials-floors'),
  ('materials','Плитка и камень','materials-tile-stone'),
  ('materials','Отделка (ГКЛ, краски, грунты)','materials-finishing'),
  ('materials','Крепёж и метизы','materials-fasteners'),
  ('materials','Инженерка: трубы, арматура, отопление, ВК','materials-mep'),
  ('materials','Электрика (кабель, щиты, розетки)','materials-electric'),
  ('materials','Лестницы, опалубка, инвентарь','materials-scaffolding'),
  ('materials','Мастики, клеи, герметики','materials-adhesives')
ON CONFLICT DO NOTHING;


