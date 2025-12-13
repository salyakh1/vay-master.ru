-- Исправление RLS политик для регистрации пользователей
-- Этот скрипт нужно выполнить в Supabase SQL Editor

-- 1. Удаляем старую политику INSERT, если она существует
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 2. Создаем новую политику, которая разрешает создание профиля при регистрации
-- Политика проверяет, что auth.uid() совпадает с id вставляемой записи
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 3. Обновляем функцию для автоматического создания профиля
-- Функция использует SECURITY DEFINER для обхода RLS при создании профиля
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, phone, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Пользователь'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'city', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Логируем ошибку, но не прерываем регистрацию
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Удаляем старый триггер, если он существует
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 5. Создаем триггер, который срабатывает при создании нового пользователя
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Проверяем, что политика SELECT разрешает всем видеть профили
-- (это должно быть уже установлено, но проверим)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Public profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
      FOR SELECT USING (true);
  END IF;
END $$;

-- 7. Проверяем, что политика UPDATE разрешает обновление своего профиля
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

