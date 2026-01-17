-- ============================================
-- Добавление RLS политик для удаления отзывов администраторами
-- ============================================
-- Этот скрипт позволяет администраторам удалять любые отзывы

-- Убеждаемся, что функция is_admin существует
-- (она должна быть создана в add_admin_delete_policies.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_admin' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'Функция is_admin не найдена. Сначала выполните add_admin_delete_policies.sql';
  END IF;
END $$;

-- ============================================
-- Master Reviews - политика для администраторов
-- ============================================
-- Удаляем старую политику, если она существует
DROP POLICY IF EXISTS "Admins can delete master reviews" ON public.master_reviews;

-- Создаем новую политику
CREATE POLICY "Admins can delete master reviews"
  ON public.master_reviews FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ============================================
-- Product Reviews - политика для администраторов
-- ============================================
-- Удаляем старую политику, если она существует
DROP POLICY IF EXISTS "Admins can delete product reviews" ON public.product_reviews;

-- Создаем новую политику
CREATE POLICY "Admins can delete product reviews"
  ON public.product_reviews FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ============================================
-- Review Replies - политика для администраторов
-- ============================================
-- Удаляем старую политику, если она существует
DROP POLICY IF EXISTS "Admins can delete review replies" ON public.review_replies;

-- Создаем новую политику
CREATE POLICY "Admins can delete review replies"
  ON public.review_replies FOR DELETE
  USING (public.is_admin(auth.uid()));
