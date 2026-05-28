-- Расширение категорий и подкатегорий мастеров: новые подкатегории и услуги
-- Выполнить в Supabase SQL Editor после categories_subcategories_schema.sql и categories_subcategories_seed.sql.
-- Подсказки в поиске мастеров подхватят новые данные автоматически (API autocomplete по таблицам categories, subcategories, services).

-- ========== 1. Строительные мастера: подкатегория Клинкер + услуги ==========
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Клинкер', 'klinker', 6 FROM public.categories c
WHERE c.slug = 'stroika'
  AND NOT EXISTS (SELECT 1 FROM public.subcategories s WHERE s.category_id = c.id AND s.slug = 'klinker');

INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'stroika' AND s.slug = 'klinker'
CROSS JOIN LATERAL (VALUES
  ('Клинкерная кладка','klinker-kladka',1),
  ('Облицовка клинкером','oblitsovka-klinker',2),
  ('Клинкерная брусчатка','klinker-bruschatka',3)
) AS v(n,sl,ord)
ON CONFLICT (subcategory_id, slug) DO NOTHING;

-- ========== 2. Кладка блока: добавить услуги (пеноблок уже есть) ==========
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'stroika' AND s.slug = 'kladka-bloka'
CROSS JOIN LATERAL (VALUES
  ('Шлакоблок','shlakoblock',4),
  ('Саманные блоки','samannye-bloki',5),
  ('ФБС блоки','fbs-bloki',6)
) AS v(n,sl,ord)
ON CONFLICT (subcategory_id, slug) DO NOTHING;

-- ========== 3. Фундаментные работы: добавить услуги ==========
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'stroika' AND s.slug = 'fundament'
CROSS JOIN LATERAL (VALUES
  ('Фундамент','fundament-obshhij',4),
  ('Монолитные работы','monolitnye-raboty',5)
) AS v(n,sl,ord)
ON CONFLICT (subcategory_id, slug) DO NOTHING;

-- ========== 4. Автосервис: подкатегория Удаление вмятин без покраски (PDR) ==========
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Удаление вмятин без покраски (PDR)', 'udalenie-vmyatin-pdr', 10 FROM public.categories c
WHERE c.slug = 'autoservice'
  AND NOT EXISTS (SELECT 1 FROM public.subcategories s WHERE s.category_id = c.id AND s.slug = 'udalenie-vmyatin-pdr');

INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'autoservice' AND s.slug = 'udalenie-vmyatin-pdr'
CROSS JOIN LATERAL (VALUES
  ('PDR удаление вмятин','pdr-udalenie-vmyatin',1),
  ('Рихтовка без покраски','rihtovka-bez-pokraski',2)
) AS v(n,sl,ord)
ON CONFLICT (subcategory_id, slug) DO NOTHING;

-- ========== 5. Работы со спецоборудованием: Токарные работы + в Сварка добавить услуги ==========
INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Токарные работы', 'tokarnye-raboty', 3 FROM public.categories c
WHERE c.slug = 'specoborudovanie'
  AND NOT EXISTS (SELECT 1 FROM public.subcategories s WHERE s.category_id = c.id AND s.slug = 'tokarnye-raboty');

INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'specoborudovanie' AND s.slug = 'tokarnye-raboty'
CROSS JOIN LATERAL (VALUES
  ('Токарные работы по металлу','tokarnye-metall',1),
  ('Токарные работы на ЧПУ','tokarnye-chpu',2),
  ('Резка и нарезка','rezka-narezka',3)
) AS v(n,sl,ord)
ON CONFLICT (subcategory_id, slug) DO NOTHING;

-- Сварка: добавить Кемпи сварка, газосварка, электросварка
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'specoborudovanie' AND s.slug = 'svarka'
CROSS JOIN LATERAL (VALUES
  ('Кемпи сварка','kempy-svarka',3),
  ('Газосварка','gazosvarka',4),
  ('Электросварка','elektrosvarka',5)
) AS v(n,sl,ord)
ON CONFLICT (subcategory_id, slug) DO NOTHING;

-- ========== 6. Спецтехника: Мини-погрузчик в Погрузчики; Манипуляторы; Бетононасосы ==========
INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'spectehnika' AND s.slug = 'pogruzchiki'
CROSS JOIN LATERAL (VALUES ('Мини-погрузчик','mini-pogruzchik',4)) AS v(n,sl,ord)
ON CONFLICT (subcategory_id, slug) DO NOTHING;

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Манипуляторы', 'manipulyatory', 7 FROM public.categories c
WHERE c.slug = 'spectehnika'
  AND NOT EXISTS (SELECT 1 FROM public.subcategories s WHERE s.category_id = c.id AND s.slug = 'manipulyatory');

INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'spectehnika' AND s.slug = 'manipulyatory'
CROSS JOIN LATERAL (VALUES
  ('Манипулятор с грузом','manipulyator-gruz',1),
  ('Погрузка/разгрузка манипулятором','pogruzka-manipulyator',2),
  ('Перевозка стройматериалов','perevozka-materialov',3)
) AS v(n,sl,ord)
ON CONFLICT (subcategory_id, slug) DO NOTHING;

INSERT INTO public.subcategories (category_id, name, slug, sort_order)
SELECT c.id, 'Бетононасосы', 'betononasosy', 8 FROM public.categories c
WHERE c.slug = 'spectehnika'
  AND NOT EXISTS (SELECT 1 FROM public.subcategories s WHERE s.category_id = c.id AND s.slug = 'betononasosy');

INSERT INTO public.services (subcategory_id, name, slug, sort_order)
SELECT s.id, v.n, v.sl, v.ord FROM public.subcategories s
JOIN public.categories c ON c.id = s.category_id AND c.slug = 'spectehnika' AND s.slug = 'betononasosy'
CROSS JOIN LATERAL (VALUES
  ('Подача бетона бетононасосом','podacha-betona',1),
  ('Автобетононасос','avtobetononasos',2),
  ('Стационарный бетононасос','stacionarnyj-betononasos',3)
) AS v(n,sl,ord)
ON CONFLICT (subcategory_id, slug) DO NOTHING;
