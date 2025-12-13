# Настройка Supabase

## Шаги для настройки базы данных

1. Создайте проект на [Supabase](https://supabase.com)

2. Перейдите в SQL Editor в панели управления Supabase

3. Выполните SQL скрипт из файла `supabase/schema.sql`

4. Получите URL и Anon Key:
   - Перейдите в Settings → API
   - Скопируйте:
     - `Project URL` → это `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` key → это `NEXT_PUBLIC_SUPABASE_ANON_KEY`

5. Создайте файл `.env.local` в корне проекта:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

6. Убедитесь, что Row Level Security (RLS) включен для всех таблиц (это уже настроено в schema.sql)

## Структура базы данных

### Таблицы:
- `profiles` - профили пользователей с ролями
- `posts` - публикации в ленте
- `post_likes` - лайки к постам
- `products` - товары продавцов
- `chats` - чаты между пользователями
- `messages` - сообщения в чатах

### Роли пользователей:
- `master` - Мастер
- `seller` - Продавец
- `client` - Клиент

## Проверка настройки

После выполнения SQL скрипта проверьте:
1. Все таблицы созданы
2. RLS политики активны
3. Триггеры работают (для обновления updated_at и likes_count)


