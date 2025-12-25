-- Исправление RLS политики для ad_banners
-- Проблема: infinite recursion detected in policy for relation "admin_roles"
-- Решение: использовать RPC функцию is_admin() вместо прямого запроса к admin_roles

-- Удаляем старую политику
DROP POLICY IF EXISTS "Admins can manage banners" ON ad_banners;

-- Создаем новую политику с использованием RPC функции
CREATE POLICY "Admins can manage banners"
  ON ad_banners
  FOR ALL
  USING (
    (SELECT is_admin(auth.uid())) = true
  )
  WITH CHECK (
    (SELECT is_admin(auth.uid())) = true
  );

