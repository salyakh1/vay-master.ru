-- ============================================
-- ДОБАВЛЕНИЕ СПЕЦИАЛИЗАЦИИ "Ремонт техники" И 20 УСЛУГ
-- ============================================
-- Инструкция: Скопируйте весь этот скрипт и выполните в Supabase SQL Editor
-- ============================================

-- Специализация "Ремонт техники"
INSERT INTO public.specializations (name, slug) VALUES
('Ремонт техники', 'repair-technics')
ON CONFLICT (slug) DO NOTHING;

-- 20 услуг для специализации "Ремонт техники"
INSERT INTO public.services (specialization_id, name, slug)
SELECT spec.id, v.service_name, v.service_slug 
FROM public.specializations spec 
CROSS JOIN LATERAL (
  VALUES
  ('Ремонт стиральных машин', 'repair-washing-machines'),
  ('Ремонт холодильников и морозильников', 'repair-refrigerators'),
  ('Ремонт посудомоечных машин', 'repair-dishwashers'),
  ('Ремонт электрических плит и варочных панелей', 'repair-electric-stoves'),
  ('Ремонт духовых шкафов', 'repair-ovens'),
  ('Ремонт микроволновых печей', 'repair-microwaves'),
  ('Ремонт сушильных машин', 'repair-dryers'),
  ('Ремонт водонагревателей (бойлеров)', 'repair-water-heaters'),
  ('Ремонт кондиционеров и сплит-систем', 'repair-air-conditioners'),
  ('Ремонт пылесосов', 'repair-vacuums'),
  ('Ремонт смартфонов и телефонов', 'repair-smartphones'),
  ('Ремонт планшетов', 'repair-tablets'),
  ('Ремонт ноутбуков', 'repair-laptops'),
  ('Ремонт настольных компьютеров (ПК)', 'repair-desktop-pcs'),
  ('Ремонт телевизоров', 'repair-tvs'),
  ('Ремонт мониторов', 'repair-monitors'),
  ('Ремонт игровых приставок', 'repair-gaming-consoles'),
  ('Ремонт принтеров и МФУ', 'repair-printers'),
  ('Ремонт кофемашин и кофеварок', 'repair-coffee-machines'),
  ('Ремонт роутеров и сетевого оборудования', 'repair-routers')
) AS v(service_name, service_slug)
WHERE spec.slug = 'repair-technics'
ON CONFLICT (specialization_id, slug) DO NOTHING;

-- ============================================
-- ГОТОВО! После выполнения скрипта:
-- 1. Специализация "Ремонт техники" появится при регистрации мастера
-- 2. 20 услуг будут доступны при выборе этой специализации
-- 3. Все будет видно в поиске мастеров и в модальном окне
-- ============================================
