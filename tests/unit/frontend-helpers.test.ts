import { describe, expect, it } from 'vitest'
import { haversineKm } from '@/lib/geo'
import { getInitials, getMasterAvatarAlt } from '@/lib/master-display'
import { localizeAuthError } from '@/components/auth/localizeAuthError'

import { getTrialEndsAt, getTrialStartAt, isProActive } from '@/lib/masterAccess'

describe('geo + master-display + auth errors', () => {
  it('haversine is ~0 for same point', () => {
    expect(haversineKm(55.75, 37.62, 55.75, 37.62)).toBeCloseTo(0, 5)
  })

  it('getInitials never returns undefined', () => {
    expect(getInitials(undefined)).toBe('?')
    expect(getInitials('')).toBe('?')
    expect(getInitials('Иван Петров')).toMatch(/И|П/)
  })

  it('avatar alt never becomes "undefined"', () => {
    expect(getMasterAvatarAlt(undefined)).not.toBe('undefined')
    expect(getMasterAvatarAlt(null)).toMatch(/мастер/i)
  })

  it('localizes known Supabase auth errors', () => {
    expect(localizeAuthError('User already registered')).toMatch(/зарегистрирован/i)
    expect(localizeAuthError('Password should be at least 6 characters')).toMatch(/Пароль/i)
    expect(localizeAuthError('Invalid login credentials')).toMatch(/пароль/i)
  })
})

describe('isProActive requires pro_until in the future', () => {
  const now = new Date('2026-08-17T12:00:00.000Z')

  it('false if is_pro true but pro_until missing or past', () => {
    expect(isProActive({ is_pro: true }, now)).toBe(false)
    expect(isProActive({ is_pro: true, pro_until: '2026-01-01T00:00:00.000Z' }, now)).toBe(false)
  })

  it('true only with is_pro and future pro_until', () => {
    expect(isProActive({ is_pro: true, pro_until: '2026-09-01T00:00:00.000Z' }, now)).toBe(true)
    expect(isProActive({ is_pro: false, pro_until: '2026-09-01T00:00:00.000Z' }, now)).toBe(false)
  })

  it('trial helpers still compute 7 days', () => {
    const start = getTrialStartAt({ created_at: '2026-08-10T12:00:00.000Z' }, now)
    expect(getTrialEndsAt(start).toISOString()).toBe('2026-08-17T12:00:00.000Z')
  })
})
