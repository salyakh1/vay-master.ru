-- ============================================
-- Настройка Storage для историй
-- ============================================

-- Создаем bucket для историй (если еще не существует)
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Политики для чтения (все могут читать)
DROP POLICY IF EXISTS "Stories are publicly readable" ON storage.objects;
CREATE POLICY "Stories are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stories');

-- Политики для загрузки (только авторизованные могут загружать)
DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
CREATE POLICY "Authenticated users can upload stories"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'stories' AND
    auth.role() = 'authenticated'
  );

-- Политики для удаления (только владелец может удалять)
DROP POLICY IF EXISTS "Users can delete their own stories" ON storage.objects;
CREATE POLICY "Users can delete their own stories"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'stories' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
