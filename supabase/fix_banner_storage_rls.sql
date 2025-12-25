-- ============================================
-- Исправление RLS политик для banner-images bucket
-- ============================================
-- Используем функцию is_admin() вместо прямого обращения к admin_roles
-- Это предотвращает проблемы с RLS на самой таблице admin_roles

-- Удаляем старые политики
DROP POLICY IF EXISTS "Public read access for banner images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload banner images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update banner images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete banner images" ON storage.objects;

-- Удаляем старую функцию, если она была создана в неправильной схеме
DROP FUNCTION IF EXISTS storage.is_user_admin();

-- Создаем функцию для проверки прав администратора на управление баннерами
-- Используем SECURITY DEFINER, чтобы обойти RLS на admin_roles
-- Функция создается в схеме public, так как storage недоступна для пользователей
CREATE OR REPLACE FUNCTION public.is_banner_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('super_admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Публичный доступ для чтения
CREATE POLICY "Public read access for banner images"
ON storage.objects FOR SELECT
USING (bucket_id = 'banner-images');

-- Админы могут загружать
CREATE POLICY "Admins can upload banner images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banner-images'
  AND public.is_banner_admin()
);

-- Админы могут обновлять
CREATE POLICY "Admins can update banner images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banner-images'
  AND public.is_banner_admin()
);

-- Админы могут удалять
CREATE POLICY "Admins can delete banner images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banner-images'
  AND public.is_banner_admin()
);

