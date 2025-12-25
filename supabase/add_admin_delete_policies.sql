-- ============================================
-- Добавление RLS политик для удаления контента администраторами
-- ============================================
-- Этот скрипт позволяет администраторам удалять любой контент

-- Функция для проверки, является ли пользователь администратором
-- (используем SECURITY DEFINER, чтобы обойти RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE admin_roles.user_id = is_admin.user_id
    AND admin_roles.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения роли администратора
CREATE OR REPLACE FUNCTION public.get_admin_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.admin_roles
    WHERE admin_roles.user_id = get_admin_role.user_id
    AND admin_roles.is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Portfolio Items - политика для администраторов
-- ============================================
CREATE POLICY "Admins can delete portfolio items"
  ON public.portfolio_items FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ============================================
-- Products - политика для администраторов
-- ============================================
CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ============================================
-- Orders - политика для администраторов
-- ============================================
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ============================================
-- Order Responses - политика для администраторов
-- ============================================
CREATE POLICY "Admins can delete order responses"
  ON public.order_responses FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ============================================
-- Portfolio Likes - политика для администраторов
-- ============================================
CREATE POLICY "Admins can delete portfolio likes"
  ON public.portfolio_likes FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ============================================
-- Portfolio Comments - политика для администраторов
-- ============================================
CREATE POLICY "Admins can delete portfolio comments"
  ON public.portfolio_comments FOR DELETE
  USING (public.is_admin(auth.uid()));

