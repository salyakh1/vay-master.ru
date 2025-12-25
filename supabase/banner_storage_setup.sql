-- Создание bucket для изображений баннеров
-- Выполните в Supabase Storage или через SQL Editor

-- Создайте bucket с именем 'banner-images' в Supabase Storage UI
-- Или выполните через SQL (если есть права):

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('banner-images', 'banner-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- RLS политики для bucket
CREATE POLICY "Public read access for banner images"
ON storage.objects FOR SELECT
USING (bucket_id = 'banner-images');

CREATE POLICY "Admins can upload banner images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banner-images'
  AND EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('super_admin', 'moderator')
  )
);

CREATE POLICY "Admins can update banner images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banner-images'
  AND EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('super_admin', 'moderator')
  )
);

CREATE POLICY "Admins can delete banner images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banner-images'
  AND EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND role IN ('super_admin', 'moderator')
  )
);

