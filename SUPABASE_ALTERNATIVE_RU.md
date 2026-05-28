# Альтернатива Supabase для работы в России

**Текущее решение проекта:** база и сервисы **Supabase (облако) остаются как есть** — `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` в `.env.local`, клиент в `lib/supabase.ts`. Ниже — справочно, если когда-нибудь понадобится замена.

Supabase (облако) в РФ может быть недоступен или нестабилен. Ниже — анализ проекта и возможные варианты.

---

## Что сейчас завязано на Supabase

| Компонент | Использование в проекте |
|-----------|--------------------------|
| **Auth** | Вход/регистрация (`signInWithPassword`, `signUp`), сессии (`getSession`), RLS по `auth.uid()` |
| **База** | PostgreSQL: `profiles`, `portfolio_items`, `products`, `orders`, `chats`, `messages`, баннеры, отзывы, категории и др. (~50+ таблиц/миграций) |
| **Storage** | Аватары, обложки, фото товаров (`product-images`), баннеры (`banner-images`), истории, загрузки в админке |
| **Realtime** | Подписка на `messages` для счётчика непрочитанных чатов в Navbar |

Схема завязана на `auth.users` (таблица пользователей Supabase Auth). Код: клиент `@supabase/supabase-js`, вызовы `supabase.from()`, `supabase.auth.*`, `supabase.storage.*`, `supabase.channel()` во многих страницах и API routes.

---

## Рекомендация: самохостинг Supabase (вариант 1)

**Почему это лучший первый шаг:** Supabase — open source. Разворачивается на своём сервере (в т.ч. в РФ). Код и схема БД не меняются, меняется только URL и ключи в `.env`.

### Что даёт

- Тот же API: `supabase.from()`, `supabase.auth`, `supabase.storage`, Realtime.
- Та же схема PostgreSQL и все миграции из папки `supabase/`.
- Работа в России: трафик идёт на ваш VPS, а не на supabase.co.

### Где размещать (РФ и СНГ)

- **Selectel** — VPS, Managed PostgreSQL, S3-совместимое хранилище.
- **VK Cloud** (ex Mail.ru) — ВМ, Managed PostgreSQL, Object Storage.
- **Timeweb** — VPS, есть БД и хранилище.
- **Beget**, **REG.RU** — VPS под самохостинг.

Минимально для самохостинга Supabase: VPS от 2–4 GB RAM, Docker. Официальная установка: [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting).

### Шаги

1. Арендовать VPS (Linux) у провайдера выше.
2. Установить Docker и Docker Compose.
3. Клонировать [github.com/supabase/supabase](https://github.com/supabase/supabase), развернуть через `docker compose` (см. их README).
4. Импортировать ваши миграции из `supabase/*.sql` в развёрнутую БД.
5. В проекте в `.env.local` заменить:
   - `NEXT_PUBLIC_SUPABASE_URL` → `https://ваш-домен-или-ip` (где слушает Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → ключ из развёрнутого Supabase (из .env в репозитории supabase).
6. Для продакшена: домен + SSL (nginx/caddy перед Supabase).

После этого приложение работает без изменений кода, только с новым бэкендом в РФ.

---

## Альтернатива 2: российский PostgreSQL + свой Auth + Storage

Если не хотите держать самохостинг Supabase, можно собрать стек из российских сервисов. Код придётся переписать.

| Задача | Вариант | Комментарий |
|--------|---------|-------------|
| **База** | VK Cloud Managed PostgreSQL или Selectel PostgreSQL | Перенос схемы: заменить `auth.users` на свою таблицу `users`, подправить внешние ключи в миграциях. |
| **Auth** | NextAuth.js (Credentials Provider) или свой JWT | Регистрация/вход через API routes, сессии в cookies/JWT. RLS не привязан к Supabase — проверки прав в коде или в политиках БД по своему `user_id`. |
| **Файлы** | VK Cloud Object Storage или Selectel S3 | Загрузка через API routes: `multipart` → сохранение в S3-совместимое хранилище, в БД хранить URL. |
| **Realtime** | Опционально: Socket.io на своём сервере или отказ от live-счётчика | Текущий счётчик непрочитанных можно заменить на опрос по таймеру через ваш API. |

Плюсы: полный контроль, всё в РФ. Минусы: большой объём работ (замена всех `supabase.from()`, переписывание auth, загрузок, при необходимости realtime).

---

## Сравнение

| Критерий | Самохостинг Supabase | VK Cloud / Selectel + NextAuth + S3 |
|----------|----------------------|-------------------------------------|
| Работа в РФ | Да (на вашем VPS) | Да |
| Изменения в коде | Минимальные (только env) | Большие (вся работа с БД и auth) |
| Срок внедрения | 1–3 дня (развёртывание + миграции) | Недели (миграция схемы, auth, storage, API) |
| Поддержка | Вы или админ сервера | Вы + управляемые сервисы |
| Стоимость | VPS ~500–2000 ₽/мес | БД + хранилище ~от 500 ₽/мес |

---

## Итог

- **Сейчас разумнее всего:** развернуть **самохостинг Supabase** на российском VPS (Selectel, VK Cloud, Timeweb и т.п.), перенести туда схему из `supabase/*.sql` и поменять в проекте только `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Так вы сохраняете текущий код и логику, а база и auth работают в РФ.
- **Долгосрочная альтернатива без Supabase:** российский PostgreSQL + NextAuth (или свой auth) + S3-совместимое хранилище; потребуется полноценная миграция бэкенда и части фронта.

В этом файле дальше можно дописать конкретные команды развёртывания под выбранный хостинг (например, пошагово для Selectel или VK Cloud).
