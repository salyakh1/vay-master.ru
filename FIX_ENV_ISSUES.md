# Исправление проблем с переменными окружения

## Проблема
После удаления префикса `NEXT_PUBLIC_` из `SUPABASE_SERVICE_ROLE_KEY` возникли ошибки подключения к Supabase.

## Решение

### 1. Проверьте файл `.env.local`

Убедитесь, что файл содержит:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_anon_key
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
ADMIN_SYSTEM_USER_ID=970f2f4c-b3e2-4b7f-af7b-45a45e50356c
```

**Важно:**
- `SUPABASE_SERVICE_ROLE_KEY` **НЕ** должен иметь префикс `NEXT_PUBLIC_`
- Это серверная переменная, доступная только в API routes

### 2. Очистите кэш Next.js

```bash
# Удалите папку .next
rm -rf .next
# или в PowerShell:
Remove-Item -Recurse -Force .next
```

### 3. Перезапустите dev-сервер

```bash
npm run dev
```

### 4. Проверьте, что переменные загружены

В консоли браузера не должно быть ошибок `ERR_CONNECTION_RESET`.

## Проверка кода

✅ **Правильно:** Service Role Key используется только в API routes:
- `app/api/**/route.ts` - все API routes
- Все эти файлы работают на сервере (server-side)

✅ **Правильно:** На клиенте используется только Anon Key:
- `lib/supabase.ts` - использует `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `app/providers.tsx` - использует клиент из `lib/supabase.ts`

## Если проблема сохраняется

1. Проверьте, что Supabase проект активен в панели управления
2. Проверьте, что ключи правильные (скопируйте заново из Supabase Dashboard)
3. Убедитесь, что нет VPN/прокси, блокирующих подключение
4. Проверьте консоль браузера на наличие других ошибок
