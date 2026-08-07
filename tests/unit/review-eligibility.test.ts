import { describe, expect, it, vi } from 'vitest'
import { hasCompletedDeal } from '@/lib/review-eligibility'

function mockAdmin(rows: unknown[]) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: rows[0] ?? null,
    error: null,
  })
  const limit = vi.fn(() => ({ maybeSingle }))
  const eq3 = vi.fn(() => ({ limit }))
  const eq2 = vi.fn(() => ({ eq: eq3 }))
  const eq1 = vi.fn(() => ({ eq: eq2 }))
  const select = vi.fn(() => ({ eq: eq1 }))
  return {
    from: vi.fn(() => ({ select })),
    __maybeSingle: maybeSingle,
  }
}

describe('hasCompletedDeal (Critical-3: reviews require completed order)', () => {
  it('returns false when no completed order exists', async () => {
    const admin = mockAdmin([])
    const ok = await hasCompletedDeal({
      admin: admin as any,
      reviewerId: 'client-1',
      targetType: 'master',
      targetId: 'master-1',
    })
    expect(ok).toBe(false)
  })

  it('returns true when completed order exists for master', async () => {
    const admin = mockAdmin([{ id: 'order-1' }])
    const ok = await hasCompletedDeal({
      admin: admin as any,
      reviewerId: 'client-1',
      targetType: 'master',
      targetId: 'master-1',
    })
    expect(ok).toBe(true)
  })
})
