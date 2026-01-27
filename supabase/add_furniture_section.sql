-- Migration: Replace product categories catalog (v2)
-- This script updates the constraint and seeds the new catalog + subcategories

-- Step 1: Drop old constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'product_categories_section_check'
    AND table_name = 'product_categories'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.product_categories DROP CONSTRAINT product_categories_section_check;
    RAISE NOTICE 'Dropped old constraint';
  END IF;
END$$;

-- Step 2: Add new constraint with updated sections
ALTER TABLE public.product_categories
ADD CONSTRAINT product_categories_section_check
CHECK (section IN ('construction', 'exterior', 'engineering', 'finishing', 'tools', 'auto'));

-- Step 3: Replace catalog with new categories
DELETE FROM public.product_subcategories;
DELETE FROM public.product_categories;

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
ON CONFLICT (section, name) DO NOTHING;

-- Subcategories: Кровля и водостоки
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Шифер','roofing-gutters-slate'),
    ('Металлочерепица','roofing-gutters-metal-tiles'),
    ('Профнастил','roofing-gutters-proflist'),
    ('Гибкая черепица','roofing-gutters-shingles'),
    ('Кровельные мембраны','roofing-gutters-membranes'),
    ('Снегозадержатели','roofing-gutters-snow-guards'),
    ('Карнизные изделия','roofing-gutters-eaves'),
    ('Водосточные трубы','roofing-gutters-pipes'),
    ('Воронки и желоба','roofing-gutters-funnels-gutters'),
    ('Проходки и аэраторы','roofing-gutters-passages-aerators')
) AS v(name, slug)
WHERE c.slug = 'roofing-gutters'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Фасады и облицовка
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Сайдинг','facades-cladding-siding'),
    ('Фасадные панели','facades-cladding-panels'),
    ('Декоративная штукатурка','facades-cladding-decor-plaster'),
    ('Клинкерная плитка','facades-cladding-clinker'),
    ('Фасадный камень','facades-cladding-stone'),
    ('Композитные панели','facades-cladding-composite'),
    ('Вентилируемые фасады','facades-cladding-vent'),
    ('Утепленные системы','facades-cladding-insulated'),
    ('Подсистемы и крепеж','facades-cladding-subsystems'),
    ('Фасадные краски','facades-cladding-paints')
) AS v(name, slug)
WHERE c.slug = 'facades-cladding'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Утеплители и изоляция
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Минеральная вата','insulation-mineral-wool'),
    ('Пенополистирол','insulation-polystyrene'),
    ('Эковата','insulation-ecowool'),
    ('PIR/PUR плиты','insulation-pir-pur'),
    ('Фольгированные','insulation-foil'),
    ('Межвенцовые','insulation-inter-crown'),
    ('Шумоизоляция','insulation-sound'),
    ('Для труб','insulation-pipes'),
    ('Для кровли','insulation-roof'),
    ('Отражающая','insulation-reflective')
) AS v(name, slug)
WHERE c.slug = 'insulation'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Гидроизоляция и герметики
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Рулонная','waterproofing-roll'),
    ('Обмазочная','waterproofing-coating'),
    ('Проникающая','waterproofing-penetrating'),
    ('ПВХ мембраны','waterproofing-pvc'),
    ('Силиконовые герметики','sealants-silicone'),
    ('Полиуретановые герметики','sealants-polyurethane'),
    ('Монтажные пены','sealants-foam'),
    ('Ленты','waterproofing-tapes'),
    ('Битумные мастики','waterproofing-bitumen'),
    ('Праймеры','waterproofing-primers')
) AS v(name, slug)
WHERE c.slug = 'waterproofing-sealants'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Заборы, ворота, ограждения
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Профлист','fences-proflist'),
    ('Штакетник','fences-pickets'),
    ('Сетка рабица','fences-chain-link'),
    ('Бетонные секции','fences-concrete'),
    ('Столбы и лаги','fences-posts-rails'),
    ('Ворота распашные','gates-swing'),
    ('Ворота откатные','gates-sliding'),
    ('Калитки','wickets'),
    ('Автоматика ворот','gates-automation'),
    ('Фурнитура и крепеж','fences-hardware')
) AS v(name, slug)
WHERE c.slug = 'fences-gates'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Благоустройство и ландшафт
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Тротуарная плитка','landscape-pavers'),
    ('Бордюры','landscape-curbs'),
    ('Геотекстиль','landscape-geotextile'),
    ('Газон рулонный','landscape-lawn'),
    ('Системы полива','landscape-irrigation'),
    ('Дренаж','landscape-drainage'),
    ('Габионы','landscape-gabions'),
    ('Садовый свет','landscape-lighting'),
    ('Мульча и щепа','landscape-mulch'),
    ('Садовые дорожки','landscape-paths')
) AS v(name, slug)
WHERE c.slug = 'landscaping-outdoor'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Строительные смеси
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Цемент','building-mixes-cement'),
    ('Пескобетон','building-mixes-sand-concrete'),
    ('Клей плиточный','building-mixes-tile-adhesive'),
    ('Штукатурки','building-mixes-plaster'),
    ('Шпаклевки','building-mixes-putty'),
    ('Наливные полы','building-mixes-self-leveling'),
    ('Стяжка','building-mixes-screed'),
    ('Грунтовки','building-mixes-primers'),
    ('Кладочные смеси','building-mixes-masonry'),
    ('Затирки','building-mixes-grout')
) AS v(name, slug)
WHERE c.slug = 'building-mixes'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Сыпучие материалы
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Песок','bulk-sand'),
    ('Щебень','bulk-gravel'),
    ('Керамзит','bulk-expanded-clay'),
    ('Гравий','bulk-gravel-round'),
    ('ПГС','bulk-pgs'),
    ('Отсев','bulk-screenings'),
    ('Глина','bulk-clay'),
    ('Известь','bulk-lime'),
    ('Чернозем/грунт','bulk-soil'),
    ('Песчано-гравий','bulk-sand-gravel')
) AS v(name, slug)
WHERE c.slug = 'bulk-materials'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Кирпич, блоки, ЖБИ
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Кирпич керамический','masonry-ceramic-brick'),
    ('Кирпич силикатный','masonry-silicate-brick'),
    ('Газоблок','masonry-aerated-block'),
    ('Пеноблок','masonry-foam-block'),
    ('Керамоблок','masonry-ceramic-block'),
    ('Перемычки','masonry-lintels'),
    ('Плиты перекрытия','masonry-slabs'),
    ('Колодезные кольца','masonry-rings'),
    ('ФБС блоки','masonry-fbs'),
    ('Бордюры/поребрики','masonry-curbs')
) AS v(name, slug)
WHERE c.slug = 'masonry-blocks-jbi'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Пиломатериалы и листовые материалы
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Брус','lumber-timber'),
    ('Доска','lumber-boards'),
    ('ОСП/OSB','lumber-osb'),
    ('Фанера','lumber-plywood'),
    ('МДФ/ДВП','lumber-mdf-hdf'),
    ('ЛДСП','lumber-ldsp'),
    ('Вагонка','lumber-clapboard'),
    ('Имитация бруса','lumber-imitation-timber'),
    ('Террасная доска','lumber-decking'),
    ('Блок-хаус','lumber-blockhouse')
) AS v(name, slug)
WHERE c.slug = 'lumber-panels'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Металлоконструкции и сварка (материалы)
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Профильные трубы','metalworks-profile-pipes'),
    ('Арматура','metalworks-rebar'),
    ('Металлический лист','metalworks-sheet'),
    ('Уголок/швеллер','metalworks-angles-channels'),
    ('Сетка сварная','metalworks-welded-mesh'),
    ('Метизы для сварки','metalworks-welding-hardware'),
    ('Электроды','metalworks-electrodes'),
    ('Проволока сварочная','metalworks-wire'),
    ('Кованые элементы','metalworks-forged'),
    ('Металлопрокат','metalworks-rolling')
) AS v(name, slug)
WHERE c.slug = 'metalworks-welding-materials'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Крепеж и метизы
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Саморезы','fasteners-screws'),
    ('Шурупы','fasteners-wood-screws'),
    ('Гвозди','fasteners-nails'),
    ('Анкеры','fasteners-anchors'),
    ('Дюбели','fasteners-dowels'),
    ('Болты','fasteners-bolts'),
    ('Гайки','fasteners-nuts'),
    ('Шайбы','fasteners-washers'),
    ('Заклепки','fasteners-rivets'),
    ('Хомуты','fasteners-clamps')
) AS v(name, slug)
WHERE c.slug = 'fasteners-hardware'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Инструменты электро
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Дрели и шуруповерты','power-tools-drills-drivers'),
    ('Перфораторы','power-tools-hammers'),
    ('Болгарки (УШМ)','power-tools-grinders'),
    ('Пилы','power-tools-saws'),
    ('Лобзики','power-tools-jigsaws'),
    ('Фрезеры','power-tools-routers'),
    ('Шлифмашины','power-tools-sanders'),
    ('Гайковерты','power-tools-impact'),
    ('Реноваторы','power-tools-multitools'),
    ('Компрессоры','power-tools-compressors')
) AS v(name, slug)
WHERE c.slug = 'power-tools'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Инструменты ручные
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Молотки','hand-tools-hammers'),
    ('Отвертки','hand-tools-screwdrivers'),
    ('Плоскогубцы','hand-tools-pliers'),
    ('Ключи','hand-tools-wrenches'),
    ('Ножи и ножницы','hand-tools-knives'),
    ('Стамески','hand-tools-chisels'),
    ('Рулетки и уровни','hand-tools-measuring'),
    ('Струбцины','hand-tools-clamps'),
    ('Пилы ручные','hand-tools-hand-saws'),
    ('Кельмы/мастерки','hand-tools-trowels')
) AS v(name, slug)
WHERE c.slug = 'hand-tools'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Расходники и оснастка
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Диски отрезные','consumables-cutting-discs'),
    ('Сверла','consumables-drill-bits'),
    ('Буры','consumables-hammer-bits'),
    ('Насадки','consumables-attachments'),
    ('Шлифленты','consumables-sanding-belts'),
    ('Круги шлифовальные','consumables-sanding-discs'),
    ('Биты','consumables-bits'),
    ('Абразивы','consumables-abrasives'),
    ('Коронки','consumables-hole-saws'),
    ('Пилки/полотна','consumables-blades')
) AS v(name, slug)
WHERE c.slug = 'consumables-accessories'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Сантехника и водоснабжение
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Трубы','plumbing-pipes'),
    ('Фитинги','plumbing-fittings'),
    ('Смесители','plumbing-faucets'),
    ('Сифоны','plumbing-traps'),
    ('Унитазы и инсталляции','plumbing-toilets'),
    ('Ванны и душевые','plumbing-baths-showers'),
    ('Насосы','plumbing-pumps'),
    ('Фильтры воды','plumbing-filters'),
    ('Водонагреватели','plumbing-water-heaters'),
    ('Арматура и запорные клапаны','plumbing-valves')
) AS v(name, slug)
WHERE c.slug = 'plumbing-water-supply'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Канализация и септики
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Трубы канализационные','sewer-pipes'),
    ('Фитинги и отводы','sewer-fittings'),
    ('Септики','sewer-septics'),
    ('ЛОС','sewer-treatment'),
    ('Дренажные системы','sewer-drainage'),
    ('Ревизии и колодцы','sewer-wells'),
    ('Люки','sewer-manhole-covers'),
    ('Аэраторы','sewer-aerators'),
    ('Жироуловители','sewer-grease-traps'),
    ('Обратные клапаны','sewer-check-valves')
) AS v(name, slug)
WHERE c.slug = 'sewer-septic'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Отопление и котельное
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Котлы','heating-boilers-devices'),
    ('Радиаторы','heating-radiators'),
    ('Теплый пол','heating-floor'),
    ('Коллекторы','heating-manifolds'),
    ('Насосы циркуляционные','heating-pumps'),
    ('Трубы','heating-pipes'),
    ('Фитинги','heating-fittings'),
    ('Дымоходы','heating-chimneys'),
    ('Запорная арматура','heating-valves'),
    ('Термостаты и автоматика','heating-automation')
) AS v(name, slug)
WHERE c.slug = 'heating-boilers'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Вентиляция и кондиционирование
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Воздуховоды','ventilation-ducts'),
    ('Решетки и диффузоры','ventilation-grilles'),
    ('Вентиляторы','ventilation-fans'),
    ('Фильтры','ventilation-filters'),
    ('Сплит-системы','ventilation-splits'),
    ('Мультисплит','ventilation-multisplit'),
    ('Кондиционеры мобильные','ventilation-mobile-ac'),
    ('Увлажнители/осушители','ventilation-humidifiers'),
    ('Рекуператоры','ventilation-recuperators'),
    ('Кронштейны и трассы','ventilation-mounts-lines')
) AS v(name, slug)
WHERE c.slug = 'ventilation-ac'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Электрика и освещение
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Кабель','electrical-cable'),
    ('Лампы','electrical-lamps'),
    ('Светильники','electrical-lighting-fixtures'),
    ('Розетки','electrical-outlets'),
    ('Выключатели','electrical-switches'),
    ('Щиты и автоматы','electrical-panels-breakers'),
    ('УЗО/дифавтоматы','electrical-rcd'),
    ('Гофра и кабель-каналы','electrical-conduits'),
    ('Датчики','electrical-sensors'),
    ('Счетчики','electrical-meters')
) AS v(name, slug)
WHERE c.slug = 'electrical-lighting'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Слаботочка и умный дом
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Интернет и роутеры','smart-home-routers'),
    ('СКС и патч-панели','smart-home-structured-cabling'),
    ('Видеодомофоны','smart-home-intercoms'),
    ('Сигнализация','smart-home-alarm'),
    ('Камеры','smart-home-cameras'),
    ('Датчики','smart-home-sensors'),
    ('Контроллеры','smart-home-controllers'),
    ('Умные розетки','smart-home-outlets'),
    ('Голосовые ассистенты','smart-home-voice'),
    ('Умный свет','smart-home-lighting')
) AS v(name, slug)
WHERE c.slug = 'low-voltage-smart-home'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Окна, двери, фурнитура
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Окна ПВХ','windows-pvc'),
    ('Окна алюминий','windows-aluminum'),
    ('Двери входные','doors-entry'),
    ('Двери межкомнатные','doors-interior'),
    ('Фурнитура оконная','windows-hardware'),
    ('Фурнитура дверная','doors-hardware'),
    ('Подоконники','windows-sills'),
    ('Откосы','windows-slopes'),
    ('Уплотнители','windows-seals'),
    ('Замки и ручки','doors-locks-handles')
) AS v(name, slug)
WHERE c.slug = 'windows-doors-hardware'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Отделочные материалы
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('ГКЛ и профили','finishing-drywall'),
    ('Краски','finishing-paints'),
    ('Обои','finishing-wallpaper'),
    ('Декоративные штукатурки','finishing-decor-plaster'),
    ('Плинтусы','finishing-baseboards'),
    ('Клеи и грунты','finishing-adhesives-primers'),
    ('Панели стеновые','finishing-wall-panels'),
    ('Потолочные системы','finishing-ceilings'),
    ('Уголки и профили','finishing-profiles'),
    ('Герметики и пены','finishing-sealants-foam')
) AS v(name, slug)
WHERE c.slug = 'finishing-materials'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Полы и напольные покрытия
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Ламинат','flooring-laminate'),
    ('Паркет','flooring-parquet'),
    ('Линолеум','flooring-linoleum'),
    ('Ковролин','flooring-carpet'),
    ('ПВХ плитка','flooring-vinyl'),
    ('Подложки','flooring-underlay'),
    ('Плинтусы','flooring-baseboards'),
    ('Пороги','flooring-thresholds'),
    ('Масла и лаки','flooring-finishes'),
    ('Теплый пол (покрытия)','flooring-floor-heat')
) AS v(name, slug)
WHERE c.slug = 'flooring'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Плитка и камень
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Керамическая плитка','tile-ceramic'),
    ('Керамогранит','tile-porcelain'),
    ('Мозаика','tile-mosaic'),
    ('Натуральный камень','tile-natural-stone'),
    ('Затирки','tile-grout'),
    ('Клей плиточный','tile-adhesive'),
    ('Профили/уголки','tile-profiles'),
    ('Инструменты плиточника','tile-tools'),
    ('Декоры','tile-decor'),
    ('Система выравнивания','tile-leveling')
) AS v(name, slug)
WHERE c.slug = 'tile-stone'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Мебель, кухонные комплектующие, фурнитура
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Петли','furniture-hinges'),
    ('Направляющие','furniture-slides'),
    ('Ручки','furniture-handles'),
    ('Подъемные механизмы','furniture-lifts'),
    ('Кромка','furniture-edge'),
    ('Столешницы','furniture-countertops'),
    ('Мойки и смесители','furniture-sinks-faucets'),
    ('Сушки/органайзеры','furniture-organizers'),
    ('Ножки/опоры','furniture-legs'),
    ('Крепеж для мебели','furniture-fasteners')
) AS v(name, slug)
WHERE c.slug = 'furniture-kitchen-hardware'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Автозапчасти: двигатель/КПП
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Двигатель','auto-engine-parts'),
    ('ГРМ/цепи','auto-timing'),
    ('Сцепление','auto-clutch'),
    ('МКПП','auto-manual-gearbox'),
    ('АКПП','auto-auto-gearbox'),
    ('Турбины','auto-turbos'),
    ('Топливная система','auto-fuel-system'),
    ('Охлаждение','auto-cooling'),
    ('Выхлоп','auto-exhaust'),
    ('Подушки двигателя','auto-engine-mounts')
) AS v(name, slug)
WHERE c.slug = 'auto-parts-engine-gearbox'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Автозапчасти: ходовая/тормоза
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Амортизаторы','auto-shocks'),
    ('Рычаги','auto-arms'),
    ('Подшипники','auto-bearings'),
    ('Стойки стабилизатора','auto-stabilizers'),
    ('Тормозные диски','auto-brake-discs'),
    ('Тормозные колодки','auto-brake-pads'),
    ('Суппорты','auto-calipers'),
    ('Рулевое управление','auto-steering'),
    ('ШРУС','auto-cv-joints'),
    ('Шины и диски','auto-wheels-tires')
) AS v(name, slug)
WHERE c.slug = 'auto-parts-suspension-brakes'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Автоэлектрика и электроника
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Аккумуляторы','auto-batteries'),
    ('Генераторы','auto-alternators'),
    ('Стартеры','auto-starters'),
    ('Освещение','auto-lighting'),
    ('Блоки управления','auto-ecu'),
    ('Датчики','auto-sensors'),
    ('Предохранители','auto-fuses'),
    ('Провода и разъемы','auto-wiring'),
    ('Мультимедиа','auto-multimedia'),
    ('Сигнализации','auto-alarms')
) AS v(name, slug)
WHERE c.slug = 'auto-electronics'
ON CONFLICT (category_id, name) DO NOTHING;

-- Subcategories: Автохимия, масла, детейлинг
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Масла моторные','auto-oils-engine'),
    ('Масла трансмиссионные','auto-oils-gearbox'),
    ('ОЖ и антифриз','auto-coolants'),
    ('Тормозные жидкости','auto-brake-fluids'),
    ('Шампуни и очистители','auto-cleaners'),
    ('Полироли','auto-polishes'),
    ('Защитные покрытия','auto-protective-coatings'),
    ('Химчистка салона','auto-interior-clean'),
    ('Стеклоомыватели','auto-washer-fluid'),
    ('Ароматизаторы','auto-fragrances')
) AS v(name, slug)
WHERE c.slug = 'auto-chemicals-detailing'
ON CONFLICT (category_id, name) DO NOTHING;
image.pngimage.png