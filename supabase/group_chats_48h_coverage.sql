-- Патч: TTL сообщений 48 ч + 1 профчат на каждую категорию мастеров
-- Выполнить в Supabase → SQL Editor ПОСЛЕ group_chats.sql (или вместе с ним)

-- 1) TTL по умолчанию = 48 часов
ALTER TABLE public.group_messages
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '48 hours');

-- 2) Уникальность: один чат на specialization_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_chats_specialization_unique
  ON public.group_chats (specialization_id)
  WHERE specialization_id IS NOT NULL;

-- 3) Создать профчат для КАЖДОЙ категории (если ещё нет)
INSERT INTO public.group_chats (name, icon, description, city, specialization_id, is_active)
SELECT
  c.name,
  CASE c.slug
    WHEN 'stroika' THEN '🏗️'
    WHEN 'otdelka-remont' THEN '🖌️'
    WHEN 'autoservice' THEN '🚗'
    WHEN 'gruzoperevozki' THEN '🚛'
    WHEN 'spectehnika' THEN '🚜'
    WHEN 'blagoustrojstvo' THEN '🌳'
    WHEN 'hudozhestvennaya-kovka' THEN '⚒️'
    WHEN 'prom-alpinizm' THEN '🧗'
    WHEN 'otkachka-kanalizacii' THEN '🚽'
    WHEN 'vodosnabzhenie' THEN '💧'
    WHEN 'klining' THEN '✨'
    WHEN 'master-na-chas' THEN '🔧'
    WHEN 'ohrana-bezopasnost' THEN '🛡️'
    WHEN 'vyvoz-musora' THEN '🗑️'
    WHEN 'gruzchiki' THEN '📦'
    WHEN 'avtoperevozki' THEN '🚐'
    WHEN 'raznorabochye' THEN '🛠️'
    WHEN 'avtopodbor' THEN '🔍'
    WHEN 'remont-tehniki' THEN '🔌'
    WHEN 'dizajn-proektirovanie' THEN '📐'
    WHEN 'specoborudovanie' THEN '⚙️'
    ELSE '💬'
  END,
  'Профчат для мастеров: ' || c.name,
  NULL,
  c.id,
  true
FROM public.categories c
WHERE NOT EXISTS (
  SELECT 1 FROM public.group_chats gc WHERE gc.specialization_id = c.id
);

-- 4) Деактивировать старые сиды без specialization_id
UPDATE public.group_chats
SET is_active = false
WHERE specialization_id IS NULL
  AND is_active = true;

-- 5) Проверка покрытия (ожидаемо missing = 0)
SELECT
  c.id,
  c.name,
  c.slug,
  gc.id AS chat_id,
  gc.is_active,
  CASE WHEN gc.id IS NULL THEN 'MISSING' ELSE 'OK' END AS coverage
FROM public.categories c
LEFT JOIN public.group_chats gc
  ON gc.specialization_id = c.id AND gc.is_active = true
ORDER BY c.sort_order, c.name;

SELECT
  (SELECT count(*) FROM public.categories) AS categories_total,
  (SELECT count(*) FROM public.group_chats WHERE specialization_id IS NOT NULL AND is_active) AS chats_linked,
  (SELECT count(*) FROM public.categories c
   WHERE NOT EXISTS (
     SELECT 1 FROM public.group_chats gc
     WHERE gc.specialization_id = c.id AND gc.is_active = true
   )) AS missing;
