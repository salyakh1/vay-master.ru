-- Проверка и создание системного пользователя "Администрация VayMaster"
-- UUID: 970f2f4c-b3e2-4b7f-af7b-45a45e50356c
-- 
-- ВАЖНО: Перед выполнением этого скрипта убедитесь, что пользователь создан в auth.users
-- Для этого:
-- 1. Перейдите в Supabase Dashboard → Authentication → Users
-- 2. Нажмите "Add user" → "Create new user"
-- 3. Email: admin@vaymaster.ru (или любой другой)
-- 4. Password: (сгенерируйте надежный пароль)
-- 5. Скопируйте UUID созданного пользователя
-- 6. Если UUID не совпадает с 970f2f4c-b3e2-4b7f-af7b-45a45e50356c, обновите ADMIN_SYSTEM_USER_ID в .env.local

-- Проверяем, существует ли системный пользователь в auth.users
-- (этот запрос может не работать из-за RLS, но попробуем)
DO $$
DECLARE
  system_user_id UUID := '970f2f4c-b3e2-4b7f-af7b-45a45e50356c';
  user_exists BOOLEAN;
BEGIN
  -- Проверяем наличие пользователя в auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE id = system_user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE NOTICE 'ВНИМАНИЕ: Пользователь с UUID % не найден в auth.users. Создайте его вручную через Supabase Dashboard → Authentication → Users', system_user_id;
  ELSE
    RAISE NOTICE 'Пользователь с UUID % найден в auth.users', system_user_id;
  END IF;
END $$;

-- Проверяем и создаем профиль для системного пользователя
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  created_at
) VALUES (
  '970f2f4c-b3e2-4b7f-af7b-45a45e50356c',
  'admin@vaymaster.ru',
  'VAY-MASTER · Администрация',
  'client',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  full_name = 'VAY-MASTER · Администрация',
  email = 'admin@vaymaster.ru';

-- Проверяем результат
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
WHERE id = '970f2f4c-b3e2-4b7f-af7b-45a45e50356c';

