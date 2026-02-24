-- Добавление новых каталогов (подкатегорий) к существующим категориям товаров.
-- Запустить в Supabase SQL Editor. Используется ON CONFLICT (category_id, name) DO NOTHING — дубликаты по имени в категории пропускаются.

-- 1. Ландшафт и дизайн (Благоустройство и ландшафт): Брусчатка
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (VALUES ('Брусчатка','landscape-bruschatka')) AS v(name, slug)
WHERE c.slug = 'landscaping-outdoor'
ON CONFLICT (category_id, name) DO NOTHING;

-- 2. Металлоконструкции и сварка: Железные трубы
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (VALUES ('Железные трубы','metalworks-iron-pipes')) AS v(name, slug)
WHERE c.slug = 'metalworks-welding-materials'
ON CONFLICT (category_id, name) DO NOTHING;

-- 3. Кирпич, блоки, ЖБИ: Кирпич, Пепло блок, Шлакоблок, Саманные блоки
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Кирпич','masonry-brick-general'),
    ('Пепло блок','masonry-peplo-block'),
    ('Шлакоблок','masonry-slag-block'),
    ('Саманные блоки','masonry-adobe-blocks')
) AS v(name, slug)
WHERE c.slug = 'masonry-blocks-jbi'
ON CONFLICT (category_id, name) DO NOTHING;

-- 4. Фасады и облицовка: Природный камень, Имитация природного камня
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Природный камень','facades-natural-stone'),
    ('Имитация природного камня','facades-imitation-stone')
) AS v(name, slug)
WHERE c.slug = 'facades-cladding'
ON CONFLICT (category_id, name) DO NOTHING;

-- 5. Вентиляция и кондиционирование: Кондиционеры для дома
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (VALUES ('Кондиционеры для дома','ventilation-home-ac')) AS v(name, slug)
WHERE c.slug = 'ventilation-ac'
ON CONFLICT (category_id, name) DO NOTHING;

-- 6. Канализация и септики: Бетонные кольца
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (VALUES ('Бетонные кольца','sewer-concrete-rings')) AS v(name, slug)
WHERE c.slug = 'sewer-septic'
ON CONFLICT (category_id, name) DO NOTHING;

-- 7. Сантехника и водоснабжение: Умывальники, Унитазы
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Умывальники','plumbing-washbasins'),
    ('Унитазы','plumbing-toilets-standalone')
) AS v(name, slug)
WHERE c.slug = 'plumbing-water-supply'
ON CONFLICT (category_id, name) DO NOTHING;

-- 8. Электрика и освещение: Аксессуары, Выключатели (если нет), Сетевые удлинители
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Аксессуары','electrical-accessories'),
    ('Сетевые удлинители','electrical-extensions')
) AS v(name, slug)
WHERE c.slug = 'electrical-lighting'
ON CONFLICT (category_id, name) DO NOTHING;

-- 9. Мебель, кухонные комплектующие, фурнитура: Спальная мебель, Кухонная мебель, Диваны и кресла, Офисная мебель, Детская мебель
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Спальная мебель','furniture-bedroom'),
    ('Кухонная мебель','furniture-kitchen'),
    ('Диваны и кресла','furniture-sofas-armchairs'),
    ('Офисная мебель','furniture-office'),
    ('Детская мебель','furniture-kids')
) AS v(name, slug)
WHERE c.slug = 'furniture-kitchen-hardware'
ON CONFLICT (category_id, name) DO NOTHING;

-- 10. Отделочные материалы: Гипсокартон, Гипсовые изделия
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Гипсокартон','finishing-drywall-sheet'),
    ('Гипсовые изделия','finishing-gypsum-products')
) AS v(name, slug)
WHERE c.slug = 'finishing-materials'
ON CONFLICT (category_id, name) DO NOTHING;

-- 11. Полы и напольные покрытия: Ковры, Ковролин (если нет), Массив, Аксессуары
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Ковры','flooring-rugs'),
    ('Массив','flooring-solid-wood'),
    ('Аксессуары','flooring-accessories')
) AS v(name, slug)
WHERE c.slug = 'flooring'
ON CONFLICT (category_id, name) DO NOTHING;

-- 12. Инструменты ручные: Набор ручных инструментов, Электромонтажный инструмент, Ручной измерительный инструмент, Система хранения инструмента, Топоры, Инструмент для кровли
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Набор ручных инструментов','hand-tools-sets'),
    ('Электромонтажный инструмент','hand-tools-electrical'),
    ('Ручной измерительный инструмент','hand-tools-measuring-tools'),
    ('Система хранения инструмента','hand-tools-storage'),
    ('Топоры','hand-tools-axes'),
    ('Инструмент для кровли','hand-tools-roofing')
) AS v(name, slug)
WHERE c.slug = 'hand-tools'
ON CONFLICT (category_id, name) DO NOTHING;

-- 13. Электроинструменты: Электроизмерительный инструмент, Сварочное оборудование, Бетономешалки
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Электроизмерительный инструмент','power-tools-electrical-measuring'),
    ('Сварочное оборудование','power-tools-welding'),
    ('Бетономешалки','power-tools-concrete-mixers')
) AS v(name, slug)
WHERE c.slug = 'power-tools'
ON CONFLICT (category_id, name) DO NOTHING;

-- 14. Крепёж и метизы: Скотчи изоленты, Скобяные изделия, Перфорированный крепёж
INSERT INTO public.product_subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.product_categories c
CROSS JOIN LATERAL (
  VALUES
    ('Скотчи изоленты','fasteners-tapes'),
    ('Скобяные изделия','fasteners-hardware-items'),
    ('Перфорированный крепёж','fasteners-perforated')
) AS v(name, slug)
WHERE c.slug = 'fasteners-hardware'
ON CONFLICT (category_id, name) DO NOTHING;
