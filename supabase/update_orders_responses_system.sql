-- ============================================
-- Обновление системы заказов и откликов
-- ============================================
-- Добавляем статус 'open' для заказов
-- Добавляем ограничение на количество откликов
-- Улучшаем индексы

-- 1. Обновляем CHECK constraint для статусов заказов
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('open', 'new', 'in_progress', 'completed', 'cancelled'));

-- 2. Обновляем дефолтный статус на 'open' для новых заказов
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'open';

-- 3. Обновляем существующие заказы со статусом 'new' на 'open'
UPDATE public.orders SET status = 'open' WHERE status = 'new';

-- 4. Создаем функцию для проверки количества откликов
CREATE OR REPLACE FUNCTION check_order_responses_limit()
RETURNS TRIGGER AS $$
DECLARE
  responses_count INTEGER;
BEGIN
  -- Подсчитываем количество откликов на заказ
  SELECT COUNT(*) INTO responses_count
  FROM public.order_responses
  WHERE order_id = NEW.order_id;
  
  -- Проверяем лимит (30 откликов)
  IF responses_count >= 30 THEN
    RAISE EXCEPTION 'Превышен лимит откликов на заказ (максимум 30)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Создаем триггер для проверки лимита откликов
DROP TRIGGER IF EXISTS check_order_responses_limit_trigger ON public.order_responses;
CREATE TRIGGER check_order_responses_limit_trigger
  BEFORE INSERT ON public.order_responses
  FOR EACH ROW
  EXECUTE FUNCTION check_order_responses_limit();

-- 6. Создаем функцию для проверки статуса заказа при отклике
CREATE OR REPLACE FUNCTION check_order_status_for_response()
RETURNS TRIGGER AS $$
DECLARE
  order_status TEXT;
BEGIN
  -- Получаем статус заказа
  SELECT status INTO order_status
  FROM public.orders
  WHERE id = NEW.order_id;
  
  -- Проверяем, что заказ открыт для откликов
  IF order_status NOT IN ('open', 'new') THEN
    RAISE EXCEPTION 'Нельзя откликнуться на заказ со статусом: %', order_status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Создаем триггер для проверки статуса заказа
DROP TRIGGER IF EXISTS check_order_status_for_response_trigger ON public.order_responses;
CREATE TRIGGER check_order_status_for_response_trigger
  BEFORE INSERT ON public.order_responses
  FOR EACH ROW
  EXECUTE FUNCTION check_order_status_for_response();

-- 8. Создаем функцию для автоматического обновления статуса заказа при принятии отклика
CREATE OR REPLACE FUNCTION update_order_on_response_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Если отклик принят, обновляем заказ
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE public.orders
    SET 
      status = 'in_progress',
      selected_master_id = NEW.master_id,
      updated_at = NOW()
    WHERE id = NEW.order_id;
    
    -- Отклоняем все остальные отклики на этот заказ
    UPDATE public.order_responses
    SET status = 'rejected'
    WHERE order_id = NEW.order_id 
      AND id != NEW.id 
      AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Создаем триггер для автоматического обновления заказа
DROP TRIGGER IF EXISTS update_order_on_response_accepted_trigger ON public.order_responses;
CREATE TRIGGER update_order_on_response_accepted_trigger
  AFTER UPDATE ON public.order_responses
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status != 'accepted')
  EXECUTE FUNCTION update_order_on_response_accepted();

-- 10. Добавляем индекс для быстрого поиска открытых заказов
CREATE INDEX IF NOT EXISTS idx_orders_status_open ON public.orders(status) 
  WHERE status IN ('open', 'new');

-- 11. Добавляем индекс для подсчета откликов
CREATE INDEX IF NOT EXISTS idx_order_responses_order_status ON public.order_responses(order_id, status);

-- 12. Обновляем RLS политику для отображения откликов всем (для заказчика и мастера)
-- Политика уже существует, но убедимся что она правильная
DROP POLICY IF EXISTS "Order responses are viewable by order owner and master" ON public.order_responses;
CREATE POLICY "Order responses are viewable by order owner and master" 
  ON public.order_responses
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_responses.order_id
      AND (
        orders.client_id = auth.uid() 
        OR order_responses.master_id = auth.uid()
      )
    )
  );

-- 13. Добавляем политику для просмотра откликов всеми (для публичного отображения)
-- Это нужно для того, чтобы заказчик мог видеть все отклики
DROP POLICY IF EXISTS "Order responses are viewable by everyone for open orders" ON public.order_responses;
CREATE POLICY "Order responses are viewable by everyone for open orders" 
  ON public.order_responses
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_responses.order_id
      AND orders.status IN ('open', 'new')
    )
  );

