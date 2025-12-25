-- ============================================
-- Назначение Super Admin для пользователя
-- ============================================
-- Email: saleh060p@gmail.com

-- ШАГ 1: Найти правильный UUID пользователя
-- Выполните этот запрос и скопируйте UUID из результата
SELECT 
  id as user_uuid,
  email,
  created_at 
FROM auth.users 
WHERE email = 'saleh060p@gmail.com';

-- ШАГ 2: После получения UUID, замените <USER_UUID> ниже на реальный UUID
-- И выполните этот запрос:

/*
INSERT INTO public.admin_roles (
  user_id, 
  role, 
  created_by, 
  is_active
)
VALUES (
  '<USER_UUID>',  -- Замените на UUID из шага 1
  'super_admin',
  '<USER_UUID>',  -- Тот же UUID
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = TIMEZONE('utc'::text, NOW()),
  updated_by = '<USER_UUID>';  -- Тот же UUID
*/

-- ШАГ 3: Проверка результата (после выполнения INSERT)
/*
SELECT 
  ar.id,
  ar.role,
  ar.is_active,
  p.email,
  p.full_name,
  ar.created_at
FROM public.admin_roles ar
JOIN public.profiles p ON p.id = ar.user_id
WHERE ar.user_id = '<USER_UUID>';
*/

