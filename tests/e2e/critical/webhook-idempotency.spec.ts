import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import path from 'path'

const root = path.join(__dirname, '../../..')

/**
 * Critical-5: повторный webhook не должен создавать второй заказ —
 * в коде обязателен атомарный claim pending → processing.
 */
test.describe('Critical: tinkoff webhook idempotency contract', () => {
  test('notification route claims pending session before insert', () => {
    const src = readFileSync(
      path.join(root, 'app/api/payments/tinkoff/notification/route.ts'),
      'utf8'
    )
    expect(src).toContain("status: 'processing'")
    expect(src).toContain(".eq('status', 'pending')")
    expect(src).toMatch(/claimPaymentSession|already_handled/)
  })

  test('SQL unique index on tinkoff_payment_id exists', () => {
    const sql = readFileSync(
      path.join(root, 'supabase/backend_security_critical.sql'),
      'utf8'
    )
    expect(sql).toContain('idx_payment_sessions_tinkoff_payment_id_unique')
  })
})
