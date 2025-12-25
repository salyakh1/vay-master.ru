-- ============================================
-- Назначение Super Admin для пользователя
-- ============================================
-- UUID: e077f474-eb2d-41df-8f41-d3847d604a8a
-- Email: saleh060p@gmail.com

-- Назначение Super Admin
INSERT INTO public.admin_roles (
  user_id, 
  role, 
  created_by, 
  is_active
)
VALUES (
  'e077f474-eb2d-41df-8f41-d3847d604a8a',
  'super_admin',
  'e077f474-eb2d-41df-8f41-d3847d604a8a',
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_at = TIMEZONE('utc'::text, NOW()),
  updated_by = 'e077f474-eb2d-41df-8f41-d3847d604a8a';

-- Проверка результата
SELECT 
  ar.id,
  ar.role,
  ar.is_active,
  p.email,
  p.full_name,
  ar.created_at
FROM public.admin_roles ar
JOIN public.profiles p ON p.id = ar.user_id
WHERE ar.user_id = 'e077f474-eb2d-41df-8f41-d3847d604a8a';

