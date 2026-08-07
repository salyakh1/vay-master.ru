-- ============================================
-- Backend Security: Critical + High (CURSOR_01)
-- Выполнить в Supabase SQL Editor
-- Зависимости: profiles, orders, order_responses;
-- payment_sessions — опционально (индекс создастся если таблица есть)
-- ============================================

-- 1) Privilege escalation: запрет самоназначения is_pro / pro_until
CREATE OR REPLACE FUNCTION public.protect_profile_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := coalesce(auth.jwt() ->> 'role', '');

  -- Только service_role может менять биллинговые поля
  IF jwt_role IS DISTINCT FROM 'service_role' THEN
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro THEN
      NEW.is_pro := OLD.is_pro;
    END IF;
    IF NEW.pro_until IS DISTINCT FROM OLD.pro_until THEN
      NEW.pro_until := OLD.pro_until;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_billing_columns_trigger ON public.profiles;
CREATE TRIGGER protect_profile_billing_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_billing_columns();

-- Дополнительно: pro_trial_started_at, если колонка существует
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'pro_trial_started_at'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.protect_profile_billing_columns()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      DECLARE
        jwt_role text;
      BEGIN
        jwt_role := coalesce(auth.jwt() ->> 'role', '');
        IF jwt_role IS DISTINCT FROM 'service_role' THEN
          IF NEW.is_pro IS DISTINCT FROM OLD.is_pro THEN
            NEW.is_pro := OLD.is_pro;
          END IF;
          IF NEW.pro_until IS DISTINCT FROM OLD.pro_until THEN
            NEW.pro_until := OLD.pro_until;
          END IF;
          IF NEW.pro_trial_started_at IS DISTINCT FROM OLD.pro_trial_started_at THEN
            NEW.pro_trial_started_at := OLD.pro_trial_started_at;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $body$;
    $fn$;
  END IF;
END $$;

-- 2) accept_order_response: проверка владельца + revoke у authenticated
CREATE OR REPLACE FUNCTION accept_order_response(
  p_response_id UUID,
  p_order_id UUID,
  p_master_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_order_status TEXT;
  v_response_status TEXT;
  v_selected_master_id UUID;
  v_client_id UUID;
  v_updated_count INTEGER;
  v_uid UUID;
BEGIN
  v_uid := auth.uid();

  SELECT status, selected_master_id, client_id
  INTO v_order_status, v_selected_master_id, v_client_id
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_client_id IS NULL THEN
    RAISE EXCEPTION 'Заказ не найден';
  END IF;

  IF v_uid IS NOT NULL AND v_uid <> v_client_id THEN
    RAISE EXCEPTION 'Только владелец заказа может принимать отклики';
  END IF;

  IF v_order_status NOT IN ('open', 'new') THEN
    RAISE EXCEPTION 'Заказ уже не принимает отклики (статус: %)', v_order_status;
  END IF;

  IF v_selected_master_id IS NOT NULL THEN
    RAISE EXCEPTION 'Исполнитель уже выбран для этого заказа';
  END IF;

  SELECT status INTO v_response_status
  FROM public.order_responses
  WHERE id = p_response_id;

  IF v_response_status != 'pending' THEN
    RAISE EXCEPTION 'Отклик уже обработан (статус: %)', v_response_status;
  END IF;

  UPDATE public.order_responses
  SET status = 'accepted'
  WHERE id = p_response_id
    AND status = 'pending'
    AND order_id = p_order_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'Не удалось обновить отклик';
  END IF;

  UPDATE public.order_responses
  SET status = 'rejected'
  WHERE order_id = p_order_id
    AND id != p_response_id
    AND status = 'pending';

  UPDATE public.orders
  SET
    status = 'in_progress',
    selected_master_id = p_master_id,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object(
    'success', true,
    'response_id', p_response_id,
    'order_id', p_order_id,
    'master_id', p_master_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION accept_order_response(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION accept_order_response(UUID, UUID, UUID) FROM authenticated;
REVOKE ALL ON FUNCTION accept_order_response(UUID, UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION accept_order_response(UUID, UUID, UUID) TO service_role;

-- 4) CHECK на длину title/description (NOT VALID — не ломает старые короткие заказы)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_title_min_length;
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_description_min_length;
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_title_min_length
      CHECK (char_length(trim(title)) >= 5) NOT VALID;
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_description_min_length
      CHECK (char_length(trim(description)) >= 30) NOT VALID;
  END IF;
END $$;

-- 5) Уникальный индекс идемпотентности Tinkoff payment id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_sessions'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_sessions_tinkoff_payment_id_unique
      ON public.payment_sessions (tinkoff_payment_id)
      WHERE tinkoff_payment_id IS NOT NULL;
  END IF;
END $$;

-- 8) pg_trgm + GIN для поиска
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='categories') THEN
    CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON public.categories USING gin (name gin_trgm_ops);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subcategories') THEN
    CREATE INDEX IF NOT EXISTS idx_subcategories_name_trgm ON public.subcategories USING gin (name gin_trgm_ops);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='services') THEN
    CREATE INDEX IF NOT EXISTS idx_services_name_trgm ON public.services USING gin (name gin_trgm_ops);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON public.profiles USING gin (full_name gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_profiles_description_trgm ON public.profiles USING gin (description gin_trgm_ops);
  END IF;
END $$;

COMMENT ON FUNCTION public.protect_profile_billing_columns() IS
  'Блокирует прямое изменение is_pro/pro_until пользователем через REST; менять может только service_role';
