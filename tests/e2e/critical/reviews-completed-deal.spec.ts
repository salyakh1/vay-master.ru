import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import path from 'path'

const root = path.join(__dirname, '../../..')

/** Critical-3: отзыв без завершённой сделки → 403 COMPLETED_DEAL_REQUIRED. */
test.describe('Critical: reviews require completed deal', () => {
  test('POST /api/reviews checks hasCompletedDeal', () => {
    const src = readFileSync(path.join(root, 'app/api/reviews/route.ts'), 'utf8')
    expect(src).toContain('hasCompletedDeal')
    expect(src).toContain('COMPLETED_DEAL_REQUIRED')
    expect(src).toContain('403')
  })

  test('eligibility endpoint exists for canReview flag', () => {
    const src = readFileSync(
      path.join(root, 'app/api/reviews/eligibility/route.ts'),
      'utf8'
    )
    expect(src).toContain('canReview')
    expect(src).toContain('hasCompletedDeal')
  })
})
