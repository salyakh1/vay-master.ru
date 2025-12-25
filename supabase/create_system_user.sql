-- Создание системного пользователя "Администрация VayMaster"
-- Выполните этот SQL в Supabase SQL Editor
-- Убедитесь, что пользователь с этим UUID уже создан в auth.users

-- Создаем профиль для системного пользователя
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  created_at
) VALUES (
  '65437d30-e3d4-40e2-8678-a8463030a43d',
  'admimvaymaster@gmail.com',
  'Администрация VayMaster',
  'client',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  full_name = 'Администрация VayMaster',
  email = 'admimvaymaster@gmail.com';

