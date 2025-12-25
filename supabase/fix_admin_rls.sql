-- ============================================
-- Исправление RLS политик для admin_roles
-- ============================================
-- Проблема: циклическая зависимость - чтобы проверить, является ли пользователь админом,
-- нужно быть админом. Это блокирует доступ к админ-панели.

-- Удаляем все старые политики для admin_roles
DROP POLICY IF EXISTS "Admins can view admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users can view their own admin role" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admin can view all admin roles" ON public.admin_roles;

-- Создаем новую политику: пользователь может видеть СВОЮ роль админа
-- Это не создает циклической зависимости, так как проверяем напрямую auth.uid()
CREATE POLICY "Users can view their own admin role"
  ON public.admin_roles FOR SELECT
  USING (auth.uid() = user_id);

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

