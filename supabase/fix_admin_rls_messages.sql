-- ============================================
-- Исправление RLS политик для admin_roles
-- ============================================
-- Проблема: циклическая зависимость - чтобы проверить, является ли пользователь админом,
-- нужно быть админом. Это блокирует доступ к админ-панели и API.

-- Удаляем все старые политики для admin_roles
DROP POLICY IF EXISTS "Admins can view admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users can view their own admin role" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admin can view all admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admin can manage admin roles" ON public.admin_roles;

-- Создаем новую политику: пользователь может видеть СВОЮ роль админа
-- Это не создает циклической зависимости, так как проверяем напрямую auth.uid()
CREATE POLICY "Users can view their own admin role"
  ON public.admin_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Политика для super_admin: может видеть все роли
-- Используем функцию get_admin_role с SECURITY DEFINER, которая обходит RLS
CREATE POLICY "Super admin can view all admin roles"
  ON public.admin_roles FOR SELECT
  USING (public.get_admin_role(auth.uid()) = 'super_admin');

-- Политика для управления ролями: только super_admin
CREATE POLICY "Super admin can manage admin roles"
  ON public.admin_roles FOR ALL
  USING (public.get_admin_role(auth.uid()) = 'super_admin');

-- Обновляем функцию is_admin, чтобы она работала без RLS
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

-- Обновляем функцию get_admin_role
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

