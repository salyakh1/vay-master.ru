import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import path from 'path'

const root = path.join(__dirname, '../../..')

/** Critical-2: чужой accept_order_response запрещён на уровне SQL. */
test.describe('Critical: accept_order_response ownership', () => {
  test('function requires client ownership and revokes authenticated execute', () => {
    const sql = readFileSync(
      path.join(root, 'supabase/backend_security_critical.sql'),
      'utf8'
    )
    expect(sql).toMatch(/v_uid := auth\.uid\(\)/)
    expect(sql).toMatch(/v_uid <> v_client_id/)
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION accept_order_response/)
    expect(sql).toMatch(/FROM authenticated/)
  })
})
