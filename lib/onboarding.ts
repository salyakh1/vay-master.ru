import type { UserRole } from '@/types/db'

export type OnboardingStepId = 'specs' | 'location' | 'profile' | 'categories' | 'task' | 'done'

export const ONBOARDING_FLOWS: Record<UserRole, OnboardingStepId[]> = {
  master: ['specs', 'location', 'profile', 'done'],
  seller: ['profile', 'location', 'categories', 'done'],
  client: ['location', 'task'],
}

const stepKey = (userId: string) => `vay_onb_step_${userId}`
const doneKey = (userId: string) => `vay_onb_done_${userId}`

export function loadOnboardingStep(userId: string, max: number): number {
  try {
    const n = Number(localStorage.getItem(stepKey(userId)))
    return Number.isInteger(n) && n >= 0 && n < max ? n : 0
  } catch {
    return 0
  }
}

export function saveOnboardingStep(userId: string, index: number): void {
  try {
    localStorage.setItem(stepKey(userId), String(index))
  } catch {
    /* ignore */
  }
}

export function markOnboardingDone(userId: string): void {
  try {
    localStorage.setItem(doneKey(userId), '1')
    localStorage.removeItem(stepKey(userId))
  } catch {
    /* ignore */
  }
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
