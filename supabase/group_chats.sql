-- Профессиональные групповые чаты (только PRO-мастера, 1 сообщение / 12 ч, TTL 48 ч)
-- Выполнить в Supabase → SQL Editor

-- ══════════════════════════════════════════════
-- 1. ТАБЛИЦА ПРОФЕССИОНАЛЬНЫХ ЧАТОВ
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.group_chats (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name                text NOT NULL,
  specialization_id   uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  city                text DEFAULT 'Москва',
  icon                text DEFAULT '🔧',
  description         text,
  members_count       int  DEFAULT 0,
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_chats_name_city
  ON public.group_chats (name, city);

-- ══════════════════════════════════════════════
-- 2. ТАБЛИЦА СООБЩЕНИЙ ПРОФЧАТА
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.group_messages (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id       uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content       text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  reply_to_id   uuid REFERENCES public.group_messages(id) ON DELETE SET NULL,
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at    timestamptz DEFAULT now()
);

-- ══════════════════════════════════════════════
-- 3. ТАБЛИЦА КУЛДАУНОВ (1 сообщение в 12 часов)
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.group_message_cooldowns (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id          uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  last_message_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chat_id)
);

-- ══════════════════════════════════════════════
-- 4. ИНДЕКСЫ
-- ══════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_group_messages_chat_id
  ON public.group_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_expires_at
  ON public.group_messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id
  ON public.group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_chat_created
  ON public.group_messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cooldowns_user_chat
  ON public.group_message_cooldowns(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_group_chats_spec
  ON public.group_chats(specialization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_chats_specialization_unique
  ON public.group_chats (specialization_id)
  WHERE specialization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_chats_city
  ON public.group_chats(city);

-- ══════════════════════════════════════════════
-- 5. RLS
-- ══════════════════════════════════════════════
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_message_cooldowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PRO masters see group chats" ON public.group_chats;
CREATE POLICY "PRO masters see group chats"
  ON public.group_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'master'
        AND is_pro = true
        AND (pro_until IS NULL OR pro_until > now())
    )
  );

DROP POLICY IF EXISTS "PRO masters see group messages" ON public.group_messages;
CREATE POLICY "PRO masters see group messages"
  ON public.group_messages FOR SELECT
  USING (
    expires_at > now()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'master'
        AND is_pro = true
        AND (pro_until IS NULL OR pro_until > now())
    )
  );

DROP POLICY IF EXISTS "PRO masters insert group messages" ON public.group_messages;
CREATE POLICY "PRO masters insert group messages"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'master'
        AND is_pro = true
        AND (pro_until IS NULL OR pro_until > now())
    )
  );

DROP POLICY IF EXISTS "Masters delete own group messages" ON public.group_messages;
CREATE POLICY "Masters delete own group messages"
  ON public.group_messages FOR DELETE
  USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users manage own cooldowns" ON public.group_message_cooldowns;
CREATE POLICY "Users manage own cooldowns"
  ON public.group_message_cooldowns FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════
-- 6. REALTIME (если ещё не добавлено)
-- ══════════════════════════════════════════════
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ══════════════════════════════════════════════
-- 7. АВТОУДАЛЕНИЕ (если есть pg_cron)
-- ══════════════════════════════════════════════
-- SELECT cron.schedule(
--   'cleanup-group-messages',
--   '0 * * * *',
--   $$DELETE FROM public.group_messages WHERE expires_at < now()$$
-- );

-- ══════════════════════════════════════════════
-- 8. 1 ПРОФЧАТ НА КАЖДУЮ КАТЕГОРИЮ МАСТЕРОВ
-- ══════════════════════════════════════════════
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

-- ══════════════════════════════════════════════
-- 9. ПРОВЕРКА ПОКРЫТИЯ
-- ══════════════════════════════════════════════
-- SELECT c.name, CASE WHEN gc.id IS NULL THEN 'MISSING' ELSE 'OK' END
-- FROM categories c
-- LEFT JOIN group_chats gc ON gc.specialization_id = c.id AND gc.is_active
-- ORDER BY c.sort_order;
