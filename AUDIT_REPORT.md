# Технический аудит VAY-MASTER

**Дата:** 2026-07-18  
**Проверено:** Cursor AI по `CURSOR_FULL_AUDIT.md`  
**Стек:** Next.js **14.2.35** · Supabase · Tailwind 3.4 · Tinkoff Acquiring (кастом)

---

## ИТОГОВАЯ ТАБЛИЦА

| Система | Статус | Детали |
|---|---|---|
| Next.js версия | ✅ 14.2.35 | Актуальная линейка 14.x |
| Supabase Auth | ✅ | `@supabase/auth-helpers-nextjs` + `@supabase/supabase-js` |
| PRO подписки | ⚠️ | Авто через Tinkoff + ручная выдача админом; **без автопродления** |
| Платёжная система | ✅ | **Tinkoff** (не Stripe/ЮКасса); пакеты stripe/yookassa **не** в deps |
| Email уведомления | ❌ | Нет Resend / Nodemailer / SendGrid |
| Push уведомления | ❌ | Нет web-push |
| PWA manifest | ❌ | `public/manifest.json` отсутствует |
| Service Worker | ❌ | `public/sw.js` отсутствует |
| Оплата заказов | ⚠️ | Оплата **публикации** заказа; **эскроу за работу — нет** |
| Отзывы/рейтинг | ✅ | `master_reviews`, `product_reviews`, `seller_reviews` + API |
| Портфолио мастеров | ✅ | `portfolio_items` + likes/comments |
| Аналитика (admin) | ⚠️ | `/admin/analytics` — totals; **нет day/week/month API** |
| Security headers | ✅ | CSP, HSTS, X-Frame, nosniff в `next.config.js` |
| Rate limiting | ⚠️ | In-memory на 3 API; нет Upstash/Redis |
| middleware.ts | ❌ | Отсутствует |
| 404 страница | ✅ | `app/not-found.tsx` |
| error.tsx | ✅ | `app/error.tsx` |
| Скелетоны | ⚠️ | `loading.tsx` на **6** из 46 страниц |
| SEO meta tags | ⚠️ | Только статичные в `app/layout.tsx`; `generateMetadata` нет |
| .env.example | ❌ | Нет шаблона env |

---

## БЛОК 1: ЗАВИСИМОСТИ

| Пакет | Статус |
|---|---|
| Stripe | ❌ НЕТ |
| YooKassa | ❌ НЕТ |
| Robokassa | ❌ НЕТ |
| Resend / Nodemailer / SendGrid | ❌ НЕТ |
| web-push / next-pwa | ❌ НЕТ |
| Yandex Metrika pkg | ❌ НЕТ |
| Tailwind | ✅ `^3.4.0` |
| Shadcn/ui (`@radix-ui/react-dialog`) | ❌ НЕТ |
| Supabase Auth helpers | ✅ `^0.8.7` |
| Supabase JS | ✅ `^2.47.0` |

**Жёсткая правда:** платежи у вас не через npm-пакет Stripe/ЮКассы, а через **свой** `lib/tinkoff.ts` + API routes. Это нормально для РФ, но в audit-чеклисте «Stripe/ЮКасса» будет ❌, хотя Tinkoff ✅.

---

## БЛОК 2: СТРУКТУРА СТРАНИЦ

### Страницы приложения (46 `page.tsx`)

```
/                          /activity                 /activity/[type]
/admin                     /admin/analytics          /admin/banners
/admin/complaints          /admin/images             /admin/login
/admin/masters             /admin/messages           /admin/moderation
/admin/orders              /admin/payments           /admin/reviews
/admin/security            /admin/settings           /admin/subscriptions
/admin/users               /auth/login               /auth/register
/chats                     /chats/[id]               /feed
/feed/publications         /onboarding               /onboarding/seller
/onboarding/specializations /orders                  /orders/[id]
/orders/new                /orders/new/payment-success
/planner                   /portfolio/new            /pro
/pro/payment-success       /problem-result           /products
/products/[id]             /products/[id]/edit       /products/new
/profile/[id]              /profile/edit             /rules
/search                    /settings
```

### API routes (60)

Ключевые группы:
- **Payments:** `/api/payments/tinkoff/{init,create-session,create-pro-session,notification}`, `/api/payments/session-status`, `/api/payment/{order,pro}-settings`
- **PRO/admin:** `/api/admin/subscriptions/{grant,revoke,bulk,flags}`, `/api/pro/settings`
- **Orders:** `/api/orders/[id]/respond`, `/api/orders/responses/[id]/accept`
- **Search:** `/api/search/masters`, `/api/search/masters-nearby`, `/api/autocomplete`
- **Social:** notifications, chats, reviews, stories, complaints, follows, activity
- **Ads:** banners, ads impression/click

### loading / error / not-found

| Файл | Статус |
|---|---|
| `loading.tsx` | ⚠️ 6 шт: chats, settings, search, products, planner, orders |
| `error.tsx` | ✅ есть |
| `not-found.tsx` | ✅ есть |
| `middleware.ts` | ❌ нет |

---

## БЛОК 3: ТАБЛИЦЫ БД

Источник: `supabase/*.sql` + использование в коде. Отдельного `database.types.ts` **нет** — типы в `types/db.ts` (ручные интерфейсы).

| Таблица из чеклиста | Статус | Как в проекте |
|---|---|---|
| `profiles` | ✅ | Есть + `is_pro`, `pro_until` |
| `orders` | ✅ | Есть |
| `order_responses` | ✅ | Есть |
| `chats` | ✅ | Есть |
| `messages` | ✅ | Есть |
| `products` | ✅ | Есть |
| `categories` | ✅ | Есть (+ services tree) |
| `subcategories` | ✅ | Есть |
| `notifications` | ✅ | Есть |
| `banners` | ⚠️ | Таблица **`ad_banners`**, не `banners` |
| `admin_roles` | ✅ | Есть |
| `admin_audit_logs` | ✅ | Есть |
| `complaints` | ✅ | Есть |
| `user_restrictions` | ✅ | Есть |
| `pro_subscriptions` | ❌ | PRO = поля в `profiles`, не отдельная таблица |
| `pro_payments` | ❌ | Платежи в **`payment_sessions`** |
| `reviews` | ⚠️ | `master_reviews` / `product_reviews` / `seller_reviews` |
| `portfolio` | ⚠️ | **`portfolio_items`** (+ likes/comments) |
| `master_specializations` | ⚠️ | `profile_specializations` / `profile_subcategories` / `profile_services` |

**Дополнительно есть:** `follows`, `stories`, `story_views`, `system_settings`, `security_alerts`, `content_moderation`, `geocoding_cache`, product catalogs, ads stats и др.

---

## БЛОК 4: PRO-ПОДПИСКИ

| Вопрос | Ответ |
|---|---|
| Страница `/pro` | ✅ Есть (тариф, trial, оплата) |
| `/pricing` | ❌ Нет отдельной |
| `app/api/pro/` | ⚠️ Есть `/api/pro/settings`; оплата в `/api/payments/tinkoff/create-pro-session` |
| Выдача | ✅ **Авто** (webhook → `extendProByDays`) + **вручную** (admin grant/revoke/bulk) |
| Webhook | ✅ `/api/payments/tinkoff/notification` |
| Запись платежей | ✅ `payment_sessions` (status paid) |
| Автопродление | ❌ Нет recurring |
| Управление подпиской | ⚠️ `/pro` + admin `/admin/subscriptions`; отдельного billing portal нет |

---

## БЛОК 5: ПЛАТЁЖНАЯ СИСТЕМА

| Вопрос | Ответ |
|---|---|
| Какая PS | ✅ **Tinkoff Acquiring** (`lib/tinkoff.ts`) |
| Stripe / ЮКасса | ❌ Не подключены |
| Страница оплаты | ✅ Модалки + redirect; success: `/pro/payment-success`, `/orders/new/payment-success` |
| Webhook | ✅ notification route + token verify |
| Что оплачивается | ⚠️ Публикация заказа + покупка PRO |
| Эскроу за работу мастера | ❌ Нет — сделка по сути peer-to-peer после отклика |

---

## БЛОК 6: УВЕДОМЛЕНИЯ

| Канал | Статус |
|---|---|
| In-app | ✅ `/api/notifications`, activity feed |
| Email | ❌ |
| Push / PWA | ❌ нет manifest / SW |
| Welcome message | ✅ `/api/welcome-message` (in-app) |

---

## БЛОК 7: ЗАКАЗЫ — ЖИЗНЕННЫЙ ЦИКЛ

| Вопрос | Ответ |
|---|---|
| Статусы | ✅ `open` \| `new` \| `in_progress` \| `completed` \| `cancelled` |
| Отклики | ✅ `order_responses` + accept API |
| Оплата работы через платформу | ❌ Нет эскроу |
| Оплата публикации | ✅ Tinkoff (если включено в settings) |
| Отзыв после заказа | ✅ master reviews API |

---

## БЛОК 8: АНАЛИТИКА

| Что | Статус |
|---|---|
| `/admin/analytics` | ✅ Counts: users, masters, sellers, orders, products, portfolio, complaints |
| Фильтры day/week/month | ❌ Нет |
| `/api/admin/stats` | ❌ Нет (есть черновик в audit-промпте — не внедрён) |
| Yandex/Google analytics | ❌ Нет в коде |
| Admin dashboard counts | ✅ `/admin` + `useAdminNavCounts` |

---

## БЛОК 9: БЕЗОПАСНОСТЬ

| Что | Статус |
|---|---|
| Security headers | ✅ `next.config.js` (CSP, HSTS, XFO, nosniff, Referrer, Permissions-Policy) |
| Rate limit | ⚠️ `lib/rate-limit.ts` in-memory: search, autocomplete, complaints |
| middleware.ts | ❌ Нет (нет централизованного auth gate на edge) |
| RLS | ✅ Много SQL с `ENABLE ROW LEVEL SECURITY` |
| .env.example | ❌ Нет — риск для онбординга деплоя |

---

## БЛОК 11: СТАТИСТИКА ЗА ПЕРИОДЫ

В коде админ-аналитики **нет** `created_at gte/lte` по периодам day/week/month.  
API из промпта (`app/api/admin/stats/route.ts`) **не создан**.

---

## ЧТО НУЖНО СДЕЛАТЬ В ПЕРВУЮ ОЧЕРЕДЬ

### Критично (деньги / прод)

1. **[КРИТИЧНО] Проверить Tinkoff в проде** — `TINKOFF_PASSWORD`, TerminalKey, webhook URL доступен извне, `payment_sessions` + PRO продление на реальной оплате.
2. **[КРИТИЧНО] `.env.example`** — список обязательных ключей без секретов (Supabase, Tinkoff, service role).
3. **[КРИТИЧНО] Решить модель денег за работу** — сейчас нет эскроу. Либо оставить P2P (честно в UX), либо проектировать hold/release (иначе споры = ручной админ).

### Важно (рост / удержание)

4. **[ВАЖНО] Email-транзакционка** (Resend) — оплата, PRO, новый отклик, принятие отклика. Без email churn выше.
5. **[ВАЖНО] Admin stats API с period=day|week|month** — без этого нет управленческих решений по LTV/CAC.
6. **[ВАЖНО] Rate limit на платежные и auth-чувствительные API** + вынести лимитер в Redis/Upstash (in-memory сбрасывается на каждом инстансе).
7. **[ВАЖНО] `middleware.ts`** — защита `/admin/*`, опционально auth-gate.

### Желательно (продукт / UX)

8. Автопродление PRO или напоминание за 3 дня до `pro_until`.
9. PWA (manifest + SW) — если аудитория mobile web.
10. `generateMetadata` на profile/product/order — SEO и шаринг.
11. `loading.tsx` на feed, profile, admin, pro.
12. Внешняя аналитика (Метрика) — воронка оплаты PRO / публикации заказа.

---

## ЖЁСТКАЯ ПРАВДА (БИЗНЕС)

| Тема | Вердикт |
|---|---|
| Платформа как маркетплейс услуг | ✅ Костяк есть: поиск, заказы, отклики, чаты, PRO, отзывы |
| Монетизация | ⚠️ Сейчас: **плата за публикацию + PRO**. Эскроу/комиссия с сделки — нет → потолок выручки ниже |
| «Полный fintech» | ❌ Не готов — нет email, push, auto-renew, period analytics |
| Готовность к масштабу | ⚠️ Rate-limit локальный, нет middleware, нет env template |

**ROI-фокус на 2 недели:**  
1) стабильный Tinkoff webhook → 2) email на ключевые события → 3) admin period stats → 4) решение по эскроу (да/нет).

---

## КРАТКИЙ ЧЕКЛИСТ «ЕСТЬ / НЕТ»

```
✅ Next 14 + Tailwind + Supabase
✅ 46 страниц, 60 API
✅ Tinkoff платежи (PRO + публикация заказа)
✅ PRO: /pro + webhook + admin grant
✅ Заказы + отклики + статусы
✅ In-app уведомления
✅ Отзывы + портфолио + баннеры (ad_banners)
✅ Admin analytics (totals) + security headers + RLS SQL
✅ not-found + error

❌ Email / Push / PWA
❌ Stripe / ЮКасса (не нужны, если Tinkoff ок)
❌ Эскроу оплаты работы
❌ Автопродление PRO
❌ middleware.ts
❌ .env.example
❌ Period stats API
❌ generateMetadata (динамическое SEO)
⚠️ Rate limit только на 3 роута
⚠️ loading.tsx только на 6 страницах
⚠️ Имена таблиц отличаются от «идеального» чеклиста (ad_banners, portfolio_items, …)
```
