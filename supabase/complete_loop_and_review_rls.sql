-- Complete-loop + RLS отзывов + seller-only products
-- Выполнить в Supabase SQL Editor ПОСЛЕ backend_security_critical.sql

-- 1) Запрос на завершение заказа (двусторонний)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS complete_requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS complete_requested_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.orders.complete_requested_by IS 'Кто первым нажал «Работа выполнена»; вторая сторона подтверждает → completed';

CREATE OR REPLACE FUNCTION public.request_order_complete(p_order_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF o.status = 'completed' THEN
    RETURN jsonb_build_object('ok', true, 'status', 'completed', 'already', true);
  END IF;

  IF o.status IS DISTINCT FROM 'in_progress' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_in_progress', 'status', o.status);
  END IF;

  IF p_user_id IS DISTINCT FROM o.client_id AND p_user_id IS DISTINCT FROM o.selected_master_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF o.selected_master_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_master');
  END IF;

  -- Повтор того же инициатора
  IF o.complete_requested_by IS NOT NULL AND o.complete_requested_by = p_user_id THEN
    RETURN jsonb_build_object('ok', true, 'status', 'in_progress', 'waiting', true);
  END IF;

  -- Вторая сторона подтверждает
  IF o.complete_requested_by IS NOT NULL AND o.complete_requested_by IS DISTINCT FROM p_user_id THEN
    UPDATE public.orders
    SET status = 'completed',
        complete_requested_by = NULL,
        complete_requested_at = NULL,
        updated_at = timezone('utc', now())
    WHERE id = p_order_id;
    RETURN jsonb_build_object('ok', true, 'status', 'completed', 'already', false);
  END IF;

  -- Первая сторона инициирует
  UPDATE public.orders
  SET complete_requested_by = p_user_id,
      complete_requested_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  WHERE id = p_order_id;
  RETURN jsonb_build_object('ok', true, 'status', 'in_progress', 'waiting', true);
END;
$$;

-- TODO(MVP+): авто-complete через 72 часа после complete_requested_at, если вторая сторона молчит. Не включать по умолчанию.

REVOKE ALL ON FUNCTION public.request_order_complete(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_order_complete(uuid, uuid) TO service_role;

-- 2) Отзыв только после completed deal
CREATE OR REPLACE FUNCTION public.has_completed_deal_with(p_reviewer uuid, p_reviewee uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.status = 'completed'
      AND o.client_id = p_reviewer
      AND o.selected_master_id = p_reviewee
  );
$$;

REVOKE ALL ON FUNCTION public.has_completed_deal_with(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_completed_deal_with(uuid, uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "master_reviews_insert_authenticated" ON public.master_reviews;
DROP POLICY IF EXISTS "master_reviews_insert_completed_deal" ON public.master_reviews;
CREATE POLICY "master_reviews_insert_completed_deal" ON public.master_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND public.has_completed_deal_with(auth.uid(), master_id)
  );

DROP POLICY IF EXISTS "product_reviews_insert_authenticated" ON public.product_reviews;
DROP POLICY IF EXISTS "product_reviews_insert_completed_deal" ON public.product_reviews;
CREATE POLICY "product_reviews_insert_completed_deal" ON public.product_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND public.has_completed_deal_with(auth.uid(), seller_id)
  );

DROP POLICY IF EXISTS "seller_reviews_insert_authenticated" ON public.seller_reviews;
DROP POLICY IF EXISTS "seller_reviews_insert_completed_deal" ON public.seller_reviews;
CREATE POLICY "seller_reviews_insert_completed_deal" ON public.seller_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND public.has_completed_deal_with(auth.uid(), seller_id)
  );

-- 3) Создавать товары может только role=seller
DROP POLICY IF EXISTS "Sellers can create products" ON public.products;
CREATE POLICY "Sellers can create products" ON public.products
  FOR INSERT WITH CHECK (
    auth.uid() = seller_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'seller'
    )
  );
