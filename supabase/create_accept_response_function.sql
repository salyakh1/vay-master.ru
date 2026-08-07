-- ============================================
-- Функция для атомарного принятия отклика
-- (синхронизировано с backend_security_critical.sql)
-- ============================================

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
