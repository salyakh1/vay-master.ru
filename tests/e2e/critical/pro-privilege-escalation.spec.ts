import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import path from 'path'

const root = path.join(__dirname, '../../..')

/** Critical-1: пользователь не может сам выставить is_pro через REST. */
test.describe('Critical: is_pro privilege escalation guard', () => {
  test('billing columns protected by BEFORE UPDATE trigger', () => {
    const sql = readFileSync(
      path.join(root, 'supabase/backend_security_critical.sql'),
      'utf8'
    )
    expect(sql).toContain('protect_profile_billing_columns')
    expect(sql).toContain('BEFORE UPDATE ON public.profiles')
    expect(sql).toMatch(/NEW\.is_pro := OLD\.is_pro/)
    expect(sql).toMatch(/service_role/)
  })
})
