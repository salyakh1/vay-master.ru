# Исправление проблемы "Email not confirmed" при входе

## Проблема
При попытке входа появляется ошибка "Email not confirmed", которая блокирует вход пользователя.

## ✅ Решение применено!

Вы уже отключили требование подтверждения email в настройках Supabase (Authentication → Sign In / Providers → "Confirm email" = Disabled).

Теперь нужно подтвердить всех существующих пользователей, чтобы они могли войти.

## Шаг 1: Подтвердить существующих пользователей

1. Откройте Supabase Dashboard → **SQL Editor**
2. Скопируйте содержимое файла `supabase/confirm_existing_users.sql`
3. Вставьте в SQL Editor и нажмите **Run**
4. Это подтвердит всех существующих пользователей

После этого все пользователи смогут войти без ошибки "Email not confirmed".

---

## Альтернативные решения (если нужно)

### Вариант 1: Отключить требование подтверждения email (для разработки)

1. Откройте Supabase Dashboard: https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в **Authentication** → **Settings** (или **Настройки**)
4. Найдите раздел **Email Auth** (или **Email аутентификация**)
5. Найдите опцию **"Enable email confirmations"** (или **"Включить подтверждение email"**)
6. **Отключите** эту опцию (снимите галочку)
7. Нажмите **Save** (или **Сохранить**)

После этого пользователи смогут входить без подтверждения email.

### Вариант 2: Автоматически подтверждать email при регистрации (для разработки)

Если вы хотите оставить подтверждение email включенным, но автоматически подтверждать всех пользователей:

1. Откройте Supabase Dashboard
2. Перейдите в **SQL Editor**
3. Выполните следующий SQL:

```sql
-- Автоматически подтверждать всех существующих пользователей
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Создать функцию для автоматического подтверждения новых пользователей
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создать триггер
DROP TRIGGER IF EXISTS auto_confirm_on_signup ON auth.users;
CREATE TRIGGER auto_confirm_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();
```

### Вариант 3: Отправить письмо подтверждения вручную

Если пользователь уже зарегистрирован, но не подтвердил email:

1. В Supabase Dashboard перейдите в **Authentication** → **Users**
2. Найдите пользователя по email
3. Нажмите на пользователя
4. Нажмите **"Resend confirmation email"** (или **"Отправить письмо подтверждения повторно"**)

## Рекомендация

Для **разработки** рекомендуется использовать **Вариант 1** (отключить подтверждение email).

Для **продакшена** рекомендуется оставить подтверждение email включенным для безопасности.

## Проверка

После применения одного из вариантов:
1. Попробуйте войти с существующими учетными данными
2. Ошибка "Email not confirmed" должна исчезнуть
3. Вход должен проходить успешно

