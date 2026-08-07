# Test plan — VayMaster

Пересмотрен: 2026-08-08.

## Команды
```bash
npm run test:unit                 # Vitest — blocking gate
npm run test:e2e:critical         # Critical contracts — blocking gate
npm run test:e2e:smoke            # UI smoke — informational в CI
```

## Critical scenarios (должны блокировать merge)

| # | Сценарий | Где тест |
|---|----------|----------|
| 1 | Self-PRO через REST запрещён | `tests/e2e/critical/pro-privilege-escalation.spec.ts` + unit SQL |
| 2 | Accept чужого отклика запрещён | `accept-response-ownership.spec.ts` |
| 3 | Отзыв без completed deal → отказ | `reviews-completed-deal.spec.ts` + unit |
| 4 | Описание заказа < 30 символов → отказ | `order-validation.spec.ts` + unit |
| 5 | Повторный Tinkoff webhook без дубля | `webhook-idempotency.spec.ts` |

## Manual QA (роли)
- Гость: `/search`, `/products` — первый экран не пустой.
- Клиент: создать заказ с коротким описанием → ошибка; полный путь оплаты на staging.
- Мастер: отклик / accept только владельцем заказа.
- Продавец/мастер: отзыв без сделки — кнопка скрыта / 403.
