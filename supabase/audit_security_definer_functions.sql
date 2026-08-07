-- Medium: аудит SECURITY DEFINER + GRANT TO authenticated
-- accept_order_response закрыт в backend_security_critical.sql (REVOKE authenticated).
-- Ниже — список функций того же класса для ручной сверки ownership:
--   admin_schema.sql / add_admin_delete_policies.sql: is_admin, get_admin_role
--   ad_banners_schema.sql / ad_system_migration.sql: banner helpers
--   notifications_system.sql / phase5_*: create notification helpers
--   fix_registration_rls.sql: handle_new_user (auth trigger — ok)
-- Правило: любая функция с GRANT EXECUTE TO authenticated и мутацией чужих данных
-- должна проверять auth.uid() внутри тела (как accept_order_response).

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef = true
  AND n.nspname = 'public'
ORDER BY p.proname;
