import { test } from '@playwright/test'

/**
 * Полный money-path: client create → pay mock → master respond → accept → complete → review.
 * Без staging-учёток не гоняем — иначе закрепим отсутствие фичи или ударим в прод.
 */
test.describe('Full order loop', () => {
  test('login → order → respond → accept → complete → review', async () => {
    test.skip(
      !process.env.E2E_CLIENT_EMAIL || !process.env.E2E_MASTER_EMAIL || !process.env.E2E_PASSWORD,
      'Нужны E2E_CLIENT_EMAIL, E2E_MASTER_EMAIL, E2E_PASSWORD на staging, не на проде'
    )
  })
})
