# Инфраструктура (CURSOR_03)

Дата: 2026-08-08.

## 1. Rate limiting → Upstash Redis / Vercel KV (High)

In-memory `Map` в `lib/rate-limit.ts` **не шарится** между serverless-инстансами.

> Примечание: пакет `@vercel/kv` deprecated → для новых проектов используйте **Upstash Redis** из Vercel Marketplace.

### Env (Vercel Project Settings)
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
# либо legacy KV_*:
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

### Подключение
1. Vercel → Storage/Integrations → Upstash Redis → Connect.
2. Пакет `@upstash/redis` (предпочтительно) или `@vercel/kv`.
3. Следующий шаг: заменить хранилище в `lib/rate-limit.ts` на Redis с TTL (тот же API `rateLimit(...)`).

См. сниппет: `docs/infra/rate-limit-kv.example.ts` (адаптировать под `@upstash/redis`).

## 2. Sentry (High)

### Env
```
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=          # для upload source maps (опционально)
SENTRY_ORG=
SENTRY_PROJECT=
```

### Подключение
1. `npx @sentry/wizard@latest -i nextjs` (после merge — отдельный PR с конфигами `sentry.*.config.ts`).
2. Пакет `@sentry/nextjs` уже в зависимостях.
3. Алерты: error rate на `/api/payments/tinkoff/*`, `/api/orders/**`, auth.

Пока DSN не задан — Sentry не инициализируем (no-op), чтобы не ломать build.

## 3. Фоновая очередь admin-рассылки (High)

`POST /api/admin/messages` при тысячах получателей рискует таймаутом.

### Рекомендованная схема (Vercel Cron + Supabase)
1. Таблица `admin_broadcast_jobs` / `admin_broadcast_recipients` (миграция — отдельный PR в supabase/).
2. API создаёт job `pending` и сразу отвечает `{ jobId }`.
3. Cron `*/5 * * * *` → `/api/cron/admin-broadcast` обрабатывает пачку N получателей.
4. В `vercel.json` уже добавлен placeholder cron (см. файл).

Пока endpoint cron можно вернуть 501, пока таблица не создана.

## 4. Цена публикации заказа

Фактическое значение по умолчанию в коде: **200 ₽** (`lib/payment-settings-server.ts`).  
Документация должна указывать 200 ₽, не 199 ₽.
