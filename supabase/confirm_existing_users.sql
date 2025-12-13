-- Подтверждение всех существующих пользователей
-- Этот скрипт нужно выполнить в Supabase SQL Editor

-- Подтверждаем всех существующих пользователей, у которых email не подтвержден
-- Примечание: confirmed_at - это сгенерированная колонка, обновляется автоматически на основе email_confirmed_at
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- Проверяем результат - показываем последних 10 пользователей
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

