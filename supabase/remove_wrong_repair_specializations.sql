-- ============================================
-- УДАЛЕНИЕ НЕПРАВИЛЬНЫХ СПЕЦИАЛИЗАЦИЙ ПО РЕМОНТУ ТЕХНИКИ
-- ============================================
-- Инструкция: Скопируйте весь этот скрипт и выполните в Supabase SQL Editor
-- ============================================
-- Этот скрипт удаляет 20 специализаций, которые были добавлены по ошибке.
-- Они должны быть услугами (services), а не специализациями (specializations).
-- ============================================

-- Удаляем 20 неправильных специализаций
DELETE FROM public.specializations 
WHERE slug IN (
  'repair-washing-machines',
  'repair-refrigerators',
  'repair-dishwashers',
  'repair-electric-stoves',
  'repair-ovens',
  'repair-microwaves',
  'repair-dryers',
  'repair-water-heaters',
  'repair-air-conditioners',
  'repair-vacuums',
  'repair-smartphones',
  'repair-tablets',
  'repair-laptops',
  'repair-desktop-pcs',
  'repair-tvs',
  'repair-monitors',
  'repair-gaming-consoles',
  'repair-printers',
  'repair-coffee-machines',
  'repair-routers'
);

-- Если есть "РЕМОНТ ТЕХНИКИ" (в верхнем регистре), удаляем её тоже
-- (правильная специализация "Ремонт техники" будет добавлена через add_repair_technics.sql)
DELETE FROM public.specializations 
WHERE slug = 'repair-technics' AND name = 'РЕМОНТ ТЕХНИКИ';

-- ============================================
-- ГОТОВО! После выполнения этого скрипта:
-- 1. Выполните скрипт add_repair_technics.sql для добавления правильной структуры
-- 2. Будет добавлена одна специализация "Ремонт техники"
-- 3. Будет добавлено 20 услуг, связанных с этой специализацией
-- ============================================

