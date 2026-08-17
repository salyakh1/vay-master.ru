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

Cron `/api/cron/admin-broadcast` **удалён** из `vercel.json` — маршрута не было, он давал 404.

Очередь рассылок — отдельная задача: таблица jobs + новый cron, когда endpoint будет готов.

## 4. Цена публикации заказа

Фактическое значение по умолчанию в коде: **200 ₽** (`lib/payment-settings-server.ts`). Seed: `supabase/payment_settings_seed.sql`.

## 5. Preview / staging (Vercel)

Отдельного staging-кластера нет. Де-факто staging — **Vercel Preview Deployments** на каждый PR (`vay-master-ru-*.vercel.app`).

Прод: production branch `main` → https://vay-master-ru.vercel.app / https://vay-master.ru

E2E полного заказа гонять только на Preview + отдельная staging-БД (не прод). Env: `E2E_CLIENT_EMAIL`, `E2E_MASTER_EMAIL`, `E2E_PASSWORD`.

## 6. SQL на проде (обязательно руками)

Порядок в Supabase SQL Editor:

1. `payment_sessions.sql`
2. `backend_security_critical.sql`
3. `complete_loop_and_review_rls.sql`
4. `profile_services_price.sql`
5. `funnel_events.sql`

Проверка: админка `/admin/security` → блок «SQL status». Без этих скриптов `POST /api/orders/[id]/complete` вернёт 500.

## 7. ESLint в билде

`eslint.ignoreDuringBuilds: true` в `next.config.js` **оставлен** — не блокируем релиз complete-loop. Тикет: вычистить `next lint` и снять флаг отдельным PR.

## 8. Security-status в CI

Живой вызов `/api/admin/security-status` требует admin JWT и прод/preview БД. В CI — контракт исходников (`tests/unit/security-sql-contracts.test.ts`). Live-проверка — вручную в админке после прогона SQL.
