# Supabase migrations — VAY-MASTER

## Порядок применения для нового окружения

1. `admin_schema.sql` — роли админов, аудит, ограничения
2. `specializations_services_schema.sql` — категории мастеров, подкатегории, услуги
3. `product_categories.sql` — каталог товаров
4. `add_complaints_table_clean.sql` — жалобы пользователей
5. `pro_subscriptions_setup.sql` — PRO-подписки
6. `stories_schema.sql` + `stories_storage_setup.sql` — истории
7. `portfolio_likes_comments_schema.sql` — портфолио
8. `payment_sessions.sql` + `payment_settings_seed.sql` — оплата
9. `payment_sessions_add_processing_status.sql` — статус `processing` для атомарного webhook (если таблица уже была создана без него)
10. Остальные файлы `add_*`, `fix_*`, `*_migration.sql` — по необходимости после проверки дубликатов

## Новые миграции

- Именуйте файлы: `YYYYMMDD_description.sql`
- Одна логическая задача на файл
- В начале файла — комментарий с целью и зависимостями

## Применение

В Supabase SQL Editor выполняйте файлы **по порядку** из списка выше, затем дополнительные миграции из репозитория.

Для продакшена: сначала staging, затем бэкап, затем production.

## Индексы (рекомендуется)

```sql
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_client ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id);
```
