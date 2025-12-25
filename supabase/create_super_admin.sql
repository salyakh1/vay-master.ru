-- ============================================
-- Назначение Super Admin для пользователя
-- ============================================
-- Email: saleh060p@gmail.com

-- ШАГ 1: Найти правильный UUID пользователя по email
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'saleh060p@gmail.com';

-- ШАГ 2: После получения UUID из шага 1, замените <USER_UUID> в запросах ниже на реальный UUID

-- Проверка существования профиля
-- SELECT id, email, full_name, role 
-- FROM public.profiles 
-- WHERE id = '<USER_UUID>';

-- Назначение Super Admin
-- INSERT INTO public.admin_roles (
--   user_id, 
--   role, 
--   created_by, 
--   is_active
-- )
-- VALUES (
--   '<USER_UUID>',
--   'super_admin',
--   '<USER_UUID>',
--   true
-- )
-- ON CONFLICT (user_id) 
-- DO UPDATE SET
--   role = 'super_admin',
--   is_active = true,
--   updated_at = TIMEZONE('utc'::text, NOW()),
--   updated_by = '<USER_UUID>';

-- Проверка результата
-- SELECT 
--   ar.id,
--   ar.role,
--   ar.is_active,
--   p.email,
--   p.full_name,
--   ar.created_at
-- FROM public.admin_roles ar
-- JOIN public.profiles p ON p.id = ar.user_id
-- WHERE ar.user_id = '<USER_UUID>';

