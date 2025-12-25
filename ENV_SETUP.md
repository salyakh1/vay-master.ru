# Настройка переменных окружения

## Обязательные переменные для работы админ-панели

Добавьте в файл `.env.local` следующие переменные:

```env
# Supabase (уже должны быть)
NEXT_PUBLIC_SUPABASE_URL=ваш_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_anon_key

# Для полного удаления пользователей (НОВОЕ)
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
```

## Где найти SUPABASE_SERVICE_ROLE_KEY:

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в ваш проект
3. Откройте **Settings** → **API**
4. Найдите раздел **Project API keys**
5. Скопируйте **`service_role`** ключ (⚠️ НЕ используйте `anon` ключ!)
6. Добавьте его в `.env.local` как `SUPABASE_SERVICE_ROLE_KEY`

## ⚠️ ВАЖНО:

- **Service Role Key** имеет полные права доступа к базе данных
- **НЕ коммитьте** `.env.local` в Git (он уже в `.gitignore`)
- **НЕ делитесь** этим ключом публично
- Используйте его только на сервере/в API routes

## После добавления:

1. Перезапустите сервер разработки (`npm run dev`)
2. Теперь удаление пользователей будет полностью удалять их из `auth.users`

