-- Bucket для картинок специализаций и категорий (админка)
-- Выполни в Supabase: SQL Editor или создай bucket вручную в Storage

-- Вариант 1: через SQL (если есть права на storage.buckets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'admin-images',
  'admin-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Публичное чтение (картинки показываются на сайте)
CREATE POLICY "Public read admin-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'admin-images');

-- Загрузка через API с service_role (без RLS) — политика для ручной загрузки через дашборд не обязательна.
