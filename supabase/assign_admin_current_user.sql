-- ============================================
-- Назначение Super Admin текущему пользователю
-- ============================================
-- UUID текущего пользователя из консоли: b2439d4e-de06-4bd9-9a55-a7f9000313d9

-- Проверяем, существует ли пользователь
SELECT id, email, created_at 
FROM auth.users 
WHERE id = 'b2439d4e-de06-4bd9-9a55-a7f9000313d9';

-- Назначаем Super Admin роль
INSERT INTO public.admin_roles (user_id, role, is_active, created_by, updated_by)
VALUES (
  'b2439d4e-de06-4bd9-9a55-a7f9000313d9'::uuid,
  'super_admin',
  true,
  'b2439d4e-de06-4bd9-9a55-a7f9000313d9'::uuid,
  'b2439d4e-de06-4bd9-9a55-a7f9000313d9'::uuid
)
ON CONFLICT (user_id) 
DO UPDATE SET
  role = 'super_admin',
  is_active = true,
  updated_by = 'b2439d4e-de06-4bd9-9a55-a7f9000313d9'::uuid,
  updated_at = NOW();

-- Проверяем, что роль назначена
SELECT * FROM public.admin_roles 
WHERE user_id = 'b2439d4e-de06-4bd9-9a55-a7f9000313d9';

