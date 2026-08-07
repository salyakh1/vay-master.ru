# E2E

Канонические e2e-тесты лежат в [`tests/e2e`](../tests/e2e).

```bash
npx playwright install chromium
npm run test:e2e:critical   # Critical gate (без webServer)
npm run test:e2e:smoke      # Smoke UI (нужен build + start)
```
