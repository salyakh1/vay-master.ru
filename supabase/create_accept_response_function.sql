-- ============================================
-- Функция для атомарного принятия отклика
-- ============================================
-- Эта функция выполняет все операции в одной транзакции:
-- 1. Обновляет статус отклика на 'accepted'
-- 2. Отклоняет все остальные отклики
-- 3. Обновляет заказ (статус и selected_master_id)
-- 4. Защищает от race conditions

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
  v_updated_count INTEGER;
BEGIN
  -- Блокируем строку заказа для обновления (защита от race condition)
  SELECT status, selected_master_id INTO v_order_status, v_selected_master_id
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  -- Проверяем, что заказ еще открыт
  IF v_order_status NOT IN ('open', 'new') THEN
    RAISE EXCEPTION 'Заказ уже не принимает отклики (статус: %)', v_order_status;
  END IF;

  -- Проверяем, что мастер еще не выбран
  IF v_selected_master_id IS NOT NULL THEN
    RAISE EXCEPTION 'Исполнитель уже выбран для этого заказа';
  END IF;

  -- Проверяем статус отклика
  SELECT status INTO v_response_status
  FROM public.order_responses
  WHERE id = p_response_id;

  IF v_response_status != 'pending' THEN
    RAISE EXCEPTION 'Отклик уже обработан (статус: %)', v_response_status;
  END IF;

  -- Обновляем отклик на 'accepted'
  UPDATE public.order_responses
  SET status = 'accepted'
  WHERE id = p_response_id
    AND status = 'pending'
    AND order_id = p_order_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'Не удалось обновить отклик';
  END IF;

  -- Отклоняем все остальные отклики на этот заказ
  UPDATE public.order_responses
  SET status = 'rejected'
  WHERE order_id = p_order_id
    AND id != p_response_id
    AND status = 'pending';

  -- Обновляем заказ
  UPDATE public.orders
  SET 
    status = 'in_progress',
    selected_master_id = p_master_id,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- Возвращаем результат
  RETURN json_build_object(
    'success', true,
    'response_id', p_response_id,
    'order_id', p_order_id,
    'master_id', p_master_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION accept_order_response(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_order_response(UUID, UUID, UUID) TO service_role;

