-- ============================================
-- Тестовый скрипт для проверки удаления отзывов админом
-- ============================================
-- Этот скрипт поможет проверить, работает ли удаление отзывов для админов

-- 1. Проверяем, существует ли функция is_admin
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'is_admin' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Проверяем, существуют ли политики для удаления отзывов админами
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('master_reviews', 'product_reviews', 'review_replies')
AND cmd = 'DELETE'
AND (policyname LIKE '%admin%' OR policyname LIKE '%Admin%');

-- 3. Проверяем все политики для master_reviews
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'master_reviews';

-- 4. Проверяем все политики для product_reviews
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'product_reviews';

-- 5. Проверяем, является ли текущий пользователь админом
-- Используем auth.uid() для получения текущего пользователя
SELECT 
  auth.uid() as current_user_id,
  public.is_admin(auth.uid()) as is_admin_check;

-- 6. Альтернативный способ: проверка для конкретного пользователя
-- (раскомментируйте и замените UUID на нужный user_id)
-- SELECT 
--   public.is_admin('e077f474-eb2d-41df-8f41-d3847d604a8a'::uuid) as is_admin_check;
