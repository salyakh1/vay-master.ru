-- Автоматическое подтверждение email для всех пользователей
-- Этот скрипт нужно выполнить в Supabase SQL Editor

-- 1. Подтверждаем всех существующих пользователей
-- Примечание: confirmed_at - это сгенерированная колонка, обновляется автоматически
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 2. Создаем функцию для автоматического подтверждения новых пользователей
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Автоматически подтверждаем email при создании пользователя
  -- Примечание: confirmed_at - это сгенерированная колонка, обновляется автоматически
  UPDATE auth.users
  SET 
    email_confirmed_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Удаляем старый триггер, если он существует
DROP TRIGGER IF EXISTS auto_confirm_on_user_created ON auth.users;

-- 4. Создаем триггер, который автоматически подтверждает email при регистрации
CREATE TRIGGER auto_confirm_on_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_new_user();

-- 5. Проверяем результат
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

