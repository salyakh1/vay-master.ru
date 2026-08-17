import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const root = path.join(__dirname, '../../..')

test.describe('Critical: complete-loop API exists', () => {
  test('POST /api/orders/[id]/complete is implemented', () => {
    const p = path.join(root, 'app/api/orders/[id]/complete/route.ts')
    expect(existsSync(p)).toBe(true)
    const src = readFileSync(p, 'utf8')
    expect(src).toContain('request_order_complete')
    expect(src).toContain('getBearerUser')
  })
})
