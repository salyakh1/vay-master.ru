-- ============================================
-- СИСТЕМА УВЕДОМЛЕНИЙ ДЛЯ МАСТЕРОВ
-- ============================================

-- 1. Таблица уведомлений
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_order_match', 'order_response', 'order_accepted', 'order_completed', 'message', 'system')),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  -- Уникальность: один пользователь не должен получать несколько одинаковых уведомлений о заказе
  UNIQUE(user_id, order_id, type)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Политики: пользователи видят только свои уведомления
-- Используем DO блок для проверки существования политик
DO $$
BEGIN
  -- Политика SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications" ON public.notifications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Политика UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications" ON public.notifications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Политика INSERT для триггера
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'System can insert notifications'
  ) THEN
    CREATE POLICY "System can insert notifications" ON public.notifications
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 2. Маппинг категорий заказов → специализации
-- Создаем таблицу для связи категорий заказов и специализаций
CREATE TABLE IF NOT EXISTS public.order_category_specialization (
  order_category TEXT PRIMARY KEY, -- "Строительство", "Ремонт", "Сантехника" и т.д.
  specialization_id UUID REFERENCES public.specializations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Заполняем маппинг на основе существующих категорий и специализаций
-- Сначала пытаемся найти совпадения по названию
INSERT INTO public.order_category_specialization (order_category, specialization_id)
SELECT DISTINCT
  o.category,
  s.id
FROM public.orders o
CROSS JOIN public.specializations s
WHERE LOWER(TRIM(o.category)) = LOWER(TRIM(s.name))
  AND o.category IS NOT NULL
  AND o.category != ''
ON CONFLICT (order_category) DO NOTHING;

-- Добавляем популярные категории вручную, если они не совпали
-- Маппинг старых категорий на новые специализации
INSERT INTO public.order_category_specialization (order_category, specialization_id)
SELECT 
  cat.category,
  s.id
FROM (VALUES
  ('Строительство', 'general-construction'),
  ('Ремонт', 'rough-finishing'),
  ('Сантехника', 'plumbing'),
  ('Электрика', 'electrical'),
  ('Отделка', 'finish-finishing'),
  ('Кровля', 'roofing-gutter'),
  ('Окна и двери', 'windows-doors'),
  ('Ландшафт', 'landscaping'),
  ('Другое', NULL)
) AS cat(category, slug)
LEFT JOIN public.specializations s ON s.slug = cat.slug
ON CONFLICT (order_category) DO NOTHING;

-- 3. Функция для создания уведомлений при создании заказа
-- SECURITY DEFINER позволяет функции обходить RLS при создании уведомлений
CREATE OR REPLACE FUNCTION notify_masters_on_new_order()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  master_record RECORD;
  mapped_specialization_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Только для новых заказов со статусом 'open'
  IF NEW.status != 'open' OR NEW.category IS NULL OR TRIM(NEW.category) = '' THEN
    RETURN NEW;
  END IF;

  -- Находим специализацию, соответствующую категории заказа из маппинга
  SELECT specialization_id INTO mapped_specialization_id
  FROM public.order_category_specialization
  WHERE order_category = NEW.category;

  -- Ищем мастеров по специализации из маппинга
  IF mapped_specialization_id IS NOT NULL THEN
    FOR master_record IN
      SELECT DISTINCT p.id, p.full_name
      FROM public.profiles p
      INNER JOIN public.profile_specializations ps ON ps.profile_id = p.id
      WHERE ps.specialization_id = mapped_specialization_id
        AND p.role = 'master'
        AND p.id != NEW.client_id -- Не уведомляем автора заказа
    LOOP
      -- Формируем уведомление
      notification_title := 'Новый заказ по вашей специализации';
      notification_message := 'Появился новый заказ "' || NEW.title || '" в категории "' || NEW.category || '"';

      -- Создаем уведомление (избегаем дубликатов)
      INSERT INTO public.notifications (user_id, type, order_id, title, message)
      VALUES (master_record.id, 'new_order_match', NEW.id, notification_title, notification_message)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Также ищем мастеров с прямой специализацией, совпадающей с категорией заказа
  FOR master_record IN
    SELECT DISTINCT p.id, p.full_name
    FROM public.profiles p
    INNER JOIN public.profile_specializations ps ON ps.profile_id = p.id
    INNER JOIN public.specializations s ON s.id = ps.specialization_id
    WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(NEW.category))
      AND p.role = 'master'
      AND p.id != NEW.client_id
      AND (mapped_specialization_id IS NULL OR ps.specialization_id != mapped_specialization_id)
  LOOP
    notification_title := 'Новый заказ по вашей специализации';
    notification_message := 'Появился новый заказ "' || NEW.title || '" в категории "' || NEW.category || '"';

    -- Создаем уведомление (избегаем дубликатов)
    INSERT INTO public.notifications (user_id, type, order_id, title, message)
    VALUES (master_record.id, 'new_order_match', NEW.id, notification_title, notification_message)
    ON CONFLICT (user_id, order_id, type) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Триггер для автоматического создания уведомлений
DROP TRIGGER IF EXISTS trigger_notify_masters_on_new_order ON public.orders;
CREATE TRIGGER trigger_notify_masters_on_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_masters_on_new_order();

-- 5. Функция для обновления updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Комментарии для документации
COMMENT ON TABLE public.notifications IS 'Уведомления для пользователей о новых заказах, откликах и других событиях';
COMMENT ON TABLE public.order_category_specialization IS 'Маппинг категорий заказов на специализации мастеров';
COMMENT ON FUNCTION notify_masters_on_new_order() IS 'Автоматически создает уведомления для мастеров при создании нового заказа';
