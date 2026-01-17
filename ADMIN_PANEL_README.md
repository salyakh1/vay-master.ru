## Admin Panel (VayMaster)

Админ‑панель позволяет управлять пользователями, контентом, рекламой, подписками (PRO) и безопасностью.

### Основные разделы
- **Users/Masters**: пользователи и мастера (просмотр, модерация, ограничения).
- **Orders/Moderation**: управление заказами и модерация контента.
- **Banners/Ads**: рекламные баннеры и контекстная реклама.
- **Subscriptions (PRO)**: выдача/отзыв PRO и feature flags.
- **Security**: админ‑роли, ограничения, служебные настройки.

### Требования
Для части админ‑операций нужны переменные окружения:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, **не** добавлять в `NEXT_PUBLIC_*`)

Подробности по установке смотри в:
- `ADMIN_PANEL_SETUP.md`
- `ENV_SETUP.md`

