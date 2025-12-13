# Миграция полей профиля для мастеров и продавцов

Этот файл содержит инструкции по добавлению новых полей в таблицу `profiles` для мастеров и продавцов.

## Новые поля

### Для мастеров:
- `services` (TEXT) - Услуги, которые предоставляет мастер
- `service_location` (TEXT) - Место обслуживания: 'home', 'workshop', 'both'
- `experience_years` (INTEGER) - Опыт работы в годах
- `specialization` (TEXT) - Специализация/категории
- `work_schedule` (TEXT) - График работы

### Для продавцов:
- `store_address` (TEXT) - Адрес магазина/склада
- `work_hours` (TEXT) - Режим работы
- `delivery_available` (BOOLEAN) - Есть ли доставка
- `delivery_zones` (TEXT) - Зоны доставки
- `product_categories` (TEXT) - Категории товаров

## Как применить миграцию

1. Откройте Supabase Dashboard: https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в раздел **SQL Editor**
4. Откройте файл `supabase/profile_fields_migration.sql`
5. Скопируйте весь SQL код из файла
6. Вставьте код в SQL Editor
7. Нажмите **Run** (или F5)

Миграция добавит все необходимые поля в таблицу `profiles` без потери существующих данных.

## Проверка

После применения миграции вы можете проверить, что поля добавлены:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN (
  'services', 'service_location', 'experience_years', 'specialization', 'work_schedule',
  'store_address', 'work_hours', 'delivery_available', 'delivery_zones', 'product_categories'
);
```

Все поля должны быть видны в результате запроса.

