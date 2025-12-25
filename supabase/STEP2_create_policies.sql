-- ШАГ 2: СОЗДАНИЕ ПОЛИТИК (ИСПРАВЛЕННАЯ ВЕРСИЯ)
-- Выполните ЭТОТ скрипт ТОЛЬКО ПОСЛЕ успешного выполнения ШАГА 1!
-- Убедитесь, что таблица создана (проверьте в Database -> Tables)

-- Сначала убеждаемся, что функция is_admin существует и использует SECURITY DEFINER
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

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Users can create complaints" ON public.complaints;
DROP POLICY IF EXISTS "Users can view own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can view all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can update complaints" ON public.complaints;

-- Создаем политики
-- Пользователи могут создавать жалобы
CREATE POLICY "Users can create complaints"
ON public.complaints FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = complainer_id);

-- Пользователи могут просматривать свои жалобы
CREATE POLICY "Users can view own complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (auth.uid() = complainer_id);

-- Администраторы могут просматривать все жалобы
-- Используем функцию is_admin() вместо прямого SELECT, чтобы избежать рекурсии
CREATE POLICY "Admins can view all complaints"
ON public.complaints FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Администраторы могут обновлять жалобы
-- Используем функцию is_admin() вместо прямого SELECT, чтобы избежать рекурсии
CREATE POLICY "Admins can update complaints"
ON public.complaints FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

