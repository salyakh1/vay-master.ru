-- Проверка, существует ли функция is_banner_admin()
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'is_banner_admin';

-- Если функция не существует, выполните fix_banner_storage_rls.sql

