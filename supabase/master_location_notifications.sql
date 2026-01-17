-- ============================================
-- ГЕОЛОКАЦИОННЫЕ УВЕДОМЛЕНИЯ ДЛЯ МАСТЕРОВ
-- ============================================
-- Добавляет возможность фильтрации уведомлений по расстоянию от заказа до мастера

-- 1. Добавляем поля геолокации в профиль мастера
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS master_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS master_lng double precision NULL,
  ADD COLUMN IF NOT EXISTS service_radius_km integer DEFAULT 50 NULL;

-- Индексы для быстрого поиска по координатам
CREATE INDEX IF NOT EXISTS idx_profiles_master_coords ON public.profiles(master_lat, master_lng) 
  WHERE master_lat IS NOT NULL AND master_lng IS NOT NULL;

-- Комментарии
COMMENT ON COLUMN public.profiles.master_lat IS 'Широта местоположения мастера';
COMMENT ON COLUMN public.profiles.master_lng IS 'Долгота местоположения мастера';
COMMENT ON COLUMN public.profiles.service_radius_km IS 'Радиус обслуживания мастера в километрах (по умолчанию 50 км)';

-- 2. Функция для расчета расстояния между двумя точками (формула гаверсинуса)
-- Возвращает расстояние в километрах
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  earth_radius_km double precision := 6371.0;
  dlat double precision;
  dlng double precision;
  a double precision;
  c double precision;
BEGIN
  -- Проверка на NULL
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;

  -- Преобразуем градусы в радианы
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);

  -- Формула гаверсинуса
  a := sin(dlat / 2) * sin(dlat / 2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlng / 2) * sin(dlng / 2);
  
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  RETURN earth_radius_km * c;
END;
$$;

-- 3. Обновляем функцию уведомлений с проверкой расстояния
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
  distance_km double precision;
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
      SELECT DISTINCT 
        p.id, 
        p.full_name,
        p.master_lat,
        p.master_lng,
        COALESCE(p.service_radius_km, 50) as radius_km
      FROM public.profiles p
      INNER JOIN public.profile_specializations ps ON ps.profile_id = p.id
      WHERE ps.specialization_id = mapped_specialization_id
        AND p.role = 'master'
        AND p.id != NEW.client_id -- Не уведомляем автора заказа
    LOOP
      -- Проверяем расстояние, если у обоих есть координаты
      IF master_record.master_lat IS NOT NULL 
         AND master_record.master_lng IS NOT NULL
         AND NEW.lat IS NOT NULL 
         AND NEW.lng IS NOT NULL THEN
        
        -- Вычисляем расстояние
        distance_km := calculate_distance_km(
          master_record.master_lat,
          master_record.master_lng,
          NEW.lat,
          NEW.lng
        );

        -- Создаем уведомление только если заказ в радиусе обслуживания
        IF distance_km IS NOT NULL AND distance_km <= master_record.radius_km THEN
          notification_title := 'Новый заказ по вашей специализации';
          notification_message := 'Появился новый заказ "' || NEW.title || '" в категории "' || NEW.category || '" на расстоянии ' || ROUND(distance_km, 1) || ' км';

          INSERT INTO public.notifications (user_id, type, order_id, title, message)
          VALUES (master_record.id, 'new_order_match', NEW.id, notification_title, notification_message)
          ON CONFLICT DO NOTHING;
        END IF;
      ELSE
        -- Если координат нет, создаем уведомление как раньше (без проверки расстояния)
        notification_title := 'Новый заказ по вашей специализации';
        notification_message := 'Появился новый заказ "' || NEW.title || '" в категории "' || NEW.category || '"';

        INSERT INTO public.notifications (user_id, type, order_id, title, message)
        VALUES (master_record.id, 'new_order_match', NEW.id, notification_title, notification_message)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- Также ищем мастеров с прямой специализацией, совпадающей с категорией заказа
  FOR master_record IN
    SELECT DISTINCT 
      p.id, 
      p.full_name,
      p.master_lat,
      p.master_lng,
      COALESCE(p.service_radius_km, 50) as radius_km
    FROM public.profiles p
    INNER JOIN public.profile_specializations ps ON ps.profile_id = p.id
    INNER JOIN public.specializations s ON s.id = ps.specialization_id
    WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(NEW.category))
      AND p.role = 'master'
      AND p.id != NEW.client_id
      AND (mapped_specialization_id IS NULL OR ps.specialization_id != mapped_specialization_id)
  LOOP
    -- Проверяем расстояние, если у обоих есть координаты
    IF master_record.master_lat IS NOT NULL 
       AND master_record.master_lng IS NOT NULL
       AND NEW.lat IS NOT NULL 
       AND NEW.lng IS NOT NULL THEN
      
      distance_km := calculate_distance_km(
        master_record.master_lat,
        master_record.master_lng,
        NEW.lat,
        NEW.lng
      );

      IF distance_km IS NOT NULL AND distance_km <= master_record.radius_km THEN
        notification_title := 'Новый заказ по вашей специализации';
        notification_message := 'Появился новый заказ "' || NEW.title || '" в категории "' || NEW.category || '" на расстоянии ' || ROUND(distance_km, 1) || ' км';

        INSERT INTO public.notifications (user_id, type, order_id, title, message)
        VALUES (master_record.id, 'new_order_match', NEW.id, notification_title, notification_message)
        ON CONFLICT (user_id, order_id, type) DO NOTHING;
      END IF;
    ELSE
      -- Если координат нет, создаем уведомление как раньше
      notification_title := 'Новый заказ по вашей специализации';
      notification_message := 'Появился новый заказ "' || NEW.title || '" в категории "' || NEW.category || '"';

      INSERT INTO public.notifications (user_id, type, order_id, title, message)
      VALUES (master_record.id, 'new_order_match', NEW.id, notification_title, notification_message)
      ON CONFLICT (user_id, order_id, type) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Комментарии
COMMENT ON FUNCTION calculate_distance_km IS 'Вычисляет расстояние между двумя точками на Земле по формуле гаверсинуса (результат в км)';
COMMENT ON FUNCTION notify_masters_on_new_order() IS 'Автоматически создает уведомления для мастеров при создании нового заказа с учетом расстояния';
