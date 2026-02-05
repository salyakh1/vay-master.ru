-- ============================================
-- ЭТАП 5: Уведомления по заказам + сид маппинга категорий заказов
-- ============================================
-- Выполни после этапов 1–2 (схема + сид категорий/подкатегорий/услуг).
-- Нужна функция calculate_distance_km (из supabase/master_location_notifications.sql).
--
-- 1. Триггер уведомлений: мастера по category_id и profile_subcategories.
-- 2. Сид order_category_specialization: название категории заказа → category_id (для уведомлений).
-- ============================================

-- 1. Функция уведомлений при новом заказе (категории → подкатегории)
CREATE OR REPLACE FUNCTION notify_masters_on_new_order()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  master_record RECORD;
  mapped_category_id UUID;
  notification_title TEXT;
  notification_message TEXT;
  distance_km double precision;
BEGIN
  IF NEW.status != 'open' OR NEW.category IS NULL OR TRIM(NEW.category) = '' THEN
    RETURN NEW;
  END IF;

  SELECT category_id INTO mapped_category_id
  FROM public.order_category_specialization
  WHERE order_category = NEW.category;

  IF mapped_category_id IS NOT NULL THEN
    FOR master_record IN
      SELECT DISTINCT 
        p.id, 
        p.full_name,
        p.master_lat,
        p.master_lng,
        COALESCE(p.service_radius_km, 50)::integer as radius_km
      FROM public.profiles p
      INNER JOIN public.profile_subcategories psc ON psc.profile_id = p.id
      INNER JOIN public.subcategories sub ON sub.id = psc.subcategory_id
      WHERE sub.category_id = mapped_category_id
        AND p.role = 'master'
        AND p.id != NEW.client_id
    LOOP
      IF master_record.master_lat IS NOT NULL 
         AND master_record.master_lng IS NOT NULL
         AND NEW.lat IS NOT NULL 
         AND NEW.lng IS NOT NULL THEN
        distance_km := calculate_distance_km(
          master_record.master_lat, master_record.master_lng,
          NEW.lat, NEW.lng
        );
        IF distance_km IS NOT NULL AND distance_km <= master_record.radius_km THEN
          notification_title := 'Новый заказ по вашей категории';
          notification_message := 'Появился новый заказ "' || NEW.title || '" в категории "' || NEW.category || '" на расстоянии ' || ROUND(distance_km, 1) || ' км';
          INSERT INTO public.notifications (user_id, type, order_id, title, message)
          VALUES (master_record.id, 'new_order_match', NEW.id, notification_title, notification_message)
          ON CONFLICT (user_id, order_id, type) DO NOTHING;
        END IF;
      ELSE
        notification_title := 'Новый заказ по вашей категории';
        notification_message := 'Появился новый заказ "' || NEW.title || '" в категории "' || NEW.category || '"';
        INSERT INTO public.notifications (user_id, type, order_id, title, message)
        VALUES (master_record.id, 'new_order_match', NEW.id, notification_title, notification_message)
        ON CONFLICT (user_id, order_id, type) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- Прямое совпадение по названию категории (если маппинг не сработал)
  FOR master_record IN
    SELECT DISTINCT 
      p.id, 
      p.full_name,
      p.master_lat,
      p.master_lng,
      COALESCE(p.service_radius_km, 50)::integer as radius_km
    FROM public.profiles p
    INNER JOIN public.profile_subcategories psc ON psc.profile_id = p.id
    INNER JOIN public.subcategories sub ON sub.id = psc.subcategory_id
    INNER JOIN public.categories c ON c.id = sub.category_id
    WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(NEW.category))
      AND p.role = 'master'
      AND p.id != NEW.client_id
      AND (mapped_category_id IS NULL OR c.id != mapped_category_id)
  LOOP
    IF master_record.master_lat IS NOT NULL 
       AND master_record.master_lng IS NOT NULL
       AND NEW.lat IS NOT NULL 
       AND NEW.lng IS NOT NULL THEN
      distance_km := calculate_distance_km(
        master_record.master_lat, master_record.master_lng,
        NEW.lat, NEW.lng
      );
      IF distance_km IS NOT NULL AND distance_km <= master_record.radius_km THEN
        notification_title := 'Новый заказ по вашей категории';
        notification_message := 'Появился новый заказ "' || NEW.title || '" в категории "' || NEW.category || '" на расстоянии ' || ROUND(distance_km, 1) || ' км';
        INSERT INTO public.notifications (user_id, type, order_id, title, message)
        VALUES (master_record.id, 'new_order_match', NEW.id, notification_title, notification_message)
        ON CONFLICT (user_id, order_id, type) DO NOTHING;
      END IF;
    ELSE
      notification_title := 'Новый заказ по вашей категории';
      notification_message := 'Появился новый заказ "' || NEW.title || '" в категории "' || NEW.category || '"';
      INSERT INTO public.notifications (user_id, type, order_id, title, message)
      VALUES (master_record.id, 'new_order_match', NEW.id, notification_title, notification_message)
      ON CONFLICT (user_id, order_id, type) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_masters_on_new_order() IS 'Уведомления мастеров при новом заказе (схема: категории → подкатегории)';

-- 2. Триггер на таблице orders (пересоздаём, если уже есть)
DROP TRIGGER IF EXISTS trigger_notify_masters_on_new_order ON public.orders;
CREATE TRIGGER trigger_notify_masters_on_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE PROCEDURE notify_masters_on_new_order();

-- 3. Сид маппинга: название категории заказа → category_id (для быстрого поиска мастеров)
INSERT INTO public.order_category_specialization (order_category, category_id)
SELECT c.name, c.id
FROM public.categories c
ON CONFLICT (order_category) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ============================================
-- Готово. При создании заказа с category = название категории (например «Строительные мастера»)
-- мастера с подкатегориями этой категории получат уведомление.
-- ============================================
