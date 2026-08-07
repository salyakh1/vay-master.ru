import { describe, expect, it } from 'vitest'
import { haversineKm } from '@/lib/geo'
import { getInitials, getMasterAvatarAlt } from '@/lib/master-display'
import { localizeAuthError } from '@/components/auth/localizeAuthError'

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
