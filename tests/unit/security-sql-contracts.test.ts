import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const root = path.resolve(__dirname, '../..')

function readSql(...parts: string[]) {
  const p = path.join(root, ...parts)
  expect(existsSync(p), `missing ${p}`).toBe(true)
  return readFileSync(p, 'utf8')
}

describe('SQL security contracts (Critical-1,2,5 from CURSOR_01)', () => {
  it('protects is_pro/pro_until from user self-update (Critical-1)', () => {
    const sql = readSql('supabase', 'backend_security_critical.sql')
    expect(sql).toMatch(/protect_profile_billing_columns/)
    expect(sql).toMatch(/is_pro/)
    expect(sql).toMatch(/pro_until/)
    expect(sql).toMatch(/service_role/)
  })

  it('accept_order_response checks owner and revokes authenticated (Critical-2)', () => {
    const sql = readSql('supabase', 'backend_security_critical.sql')
    expect(sql).toMatch(/auth\.uid\(\)/)
    expect(sql).toMatch(/Только владелец заказа/)
    expect(sql).toMatch(/REVOKE[\s\S]*authenticated/i)
    expect(sql).toMatch(/GRANT EXECUTE[\s\S]*service_role/i)
  })

  it('orders have min length CHECKs (Critical-4 DB)', () => {
    const sql = readSql('supabase', 'backend_security_critical.sql')
    expect(sql).toMatch(/orders_title_min_length/)
    expect(sql).toMatch(/orders_description_min_length/)
    expect(sql).toMatch(/char_length\(trim\(description\)\) >= 30/)
  })

  it('payment_sessions has unique tinkoff_payment_id (Critical-5)', () => {
    const sql = readSql('supabase', 'backend_security_critical.sql')
    expect(sql).toMatch(/idx_payment_sessions_tinkoff_payment_id_unique/)
    expect(sql).toMatch(/tinkoff_payment_id/)
  })

  it('webhook claim uses processing status', () => {
    const route = readFileSync(
      path.join(root, 'app/api/payments/tinkoff/notification/route.ts'),
      'utf8'
    )
    expect(route).toMatch(/status:\s*'processing'/)
    expect(route).toMatch(/eq\('status',\s*'pending'\)/)
  })
})

describe('complete-loop SQL (CURSOR_04)', () => {
  it('request_order_complete is two-sided and idempotent', () => {
    const sql = readSql('supabase', 'complete_loop_and_review_rls.sql')
    expect(sql).toMatch(/request_order_complete/)
    expect(sql).toMatch(/complete_requested_by/)
    expect(sql).toMatch(/status = 'completed'/)
    expect(sql).toMatch(/already/)
    expect(sql).toMatch(/GRANT EXECUTE[\s\S]*service_role/i)
  })

  it('reviews INSERT requires completed deal helper', () => {
    const sql = readSql('supabase', 'complete_loop_and_review_rls.sql')
    expect(sql).toMatch(/has_completed_deal_with/)
    expect(sql).toMatch(/master_reviews_insert_completed_deal/)
    expect(sql).toMatch(/p\.role = 'seller'/)
  })

  it('funnel_events table exists in repo', () => {
    const sql = readSql('supabase', 'funnel_events.sql')
    expect(sql).toMatch(/funnel_events/)
  })

  it('seed price is 200', () => {
    const sql = readSql('supabase', 'payment_settings_seed.sql')
    expect(sql).toMatch(/order_publication_price_rub',\s*'200'/)
    expect(sql).not.toMatch(/'199'/)
  })
})
