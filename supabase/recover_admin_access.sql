-- ============================================
-- ВОССТАНОВЛЕНИЕ ДОСТУПА К АДМИН-ПАНЕЛИ
-- ============================================
-- Если вы забыли пароль и логин администратора, используйте этот скрипт
-- Выполните в Supabase SQL Editor

-- ============================================
-- ШАГ 1: Просмотр всех пользователей в системе
-- ============================================
-- Выполните этот запрос, чтобы увидеть всех пользователей и их email
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created,
  p.full_name,
  p.role as user_role,
  ar.role as admin_role,
  ar.is_active as admin_active
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.admin_roles ar ON ar.user_id = u.id
ORDER BY u.created_at DESC;

-- ============================================
-- ШАГ 2: Назначение администратора по EMAIL
-- ============================================
-- Замените 'ВАШ_EMAIL@example.com' на email пользователя, которому хотите дать права администратора
-- Затем выполните этот блок:

DO $$
DECLARE
  target_email TEXT := 'ВАШ_EMAIL@example.com';  -- ЗАМЕНИТЕ НА ВАШ EMAIL!
  target_user_id UUID;
BEGIN
  -- Находим пользователя по email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Пользователь с email % не найден', target_email;
  END IF;
  
  -- Назначаем Super Admin
  INSERT INTO public.admin_roles (
    user_id, 
    role, 
    created_by, 
    is_active,
    updated_by
  )
  VALUES (
    target_user_id,
    'super_admin',
    target_user_id,
    true,
    target_user_id
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    updated_at = TIMEZONE('utc'::text, NOW()),
    updated_by = target_user_id;
  
  RAISE NOTICE 'Администратор успешно назначен для пользователя: % (ID: %)', target_email, target_user_id;
END $$;

-- ============================================
-- ШАГ 3: Назначение администратора по UUID
-- ============================================
-- Если вы знаете UUID пользователя, используйте этот запрос:
-- Замените 'ВАШ_UUID_ЗДЕСЬ' на UUID пользователя

/*
INSERT INTO public.admin_roles (
  user_id, 
  role, 
  created_by, 
  is_active,
  updated_by
)
VALUES (
  'ВАШ_UUID_ЗДЕСЬ'::uuid,  -- ЗАМЕНИТЕ НА UUID!
  'super_admin',
  'ВАШ_UUID_ЗДЕСЬ'::uuid,
  true,
  'ВАШ_UUID_ЗДЕСЬ'::uuid
)
ON CONFLICT (user_id) 
DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = TIMEZONE('utc'::text, NOW()),
  updated_by = 'ВАШ_UUID_ЗДЕСЬ'::uuid;
*/

-- ============================================
-- ШАГ 4: Проверка назначенных администраторов
-- ============================================
-- Выполните этот запрос, чтобы увидеть всех администраторов:
SELECT 
  ar.id,
  ar.role,
  ar.is_active,
  p.email,
  p.full_name,
  ar.created_at,
  ar.updated_at
FROM public.admin_roles ar
JOIN public.profiles p ON p.id = ar.user_id
WHERE ar.is_active = true
ORDER BY ar.created_at DESC;

