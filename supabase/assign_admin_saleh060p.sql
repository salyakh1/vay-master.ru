-- ============================================
-- Назначение Super Admin для пользователя
-- ============================================
-- Email: saleh060p@gmail.com
-- UUID: e077f474-eb2d-41df-8f41-d3847d604a8a

-- Проверяем, что пользователь существует
SELECT 
  id as user_id,
  email,
  created_at 
FROM auth.users 
WHERE id = 'e077f474-eb2d-41df-8f41-d3847d604a8a';

-- Проверяем, что профиль существует
SELECT 
  id,
  email,
  full_name,
  role 
FROM public.profiles 
WHERE id = 'e077f474-eb2d-41df-8f41-d3847d604a8a';

-- Назначаем Super Admin
INSERT INTO public.admin_roles (
  user_id, 
  role, 
  created_by, 
  is_active,
  updated_by
)
VALUES (
  'e077f474-eb2d-41df-8f41-d3847d604a8a'::uuid,
  'super_admin',
  'e077f474-eb2d-41df-8f41-d3847d604a8a'::uuid,
  true,
  'e077f474-eb2d-41df-8f41-d3847d604a8a'::uuid
)
ON CONFLICT (user_id) 
DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = TIMEZONE('utc'::text, NOW()),
  updated_by = 'e077f474-eb2d-41df-8f41-d3847d604a8a'::uuid;

-- Проверка результата
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
WHERE ar.user_id = 'e077f474-eb2d-41df-8f41-d3847d604a8a';

