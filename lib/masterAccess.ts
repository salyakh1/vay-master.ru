export type MasterAccess = {
  isPro: boolean
  isTrial: boolean
  trialEndsAt: Date
}

const DAY_MS = 24 * 60 * 60 * 1000

export function getTrialEndsAt(createdAt: string | Date): Date {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  return new Date(created.getTime() + 7 * DAY_MS)
}

export function getTrialStartAt(profile: any, now: Date = new Date()): Date {
  const raw = profile?.pro_trial_started_at || profile?.created_at
  const d = raw ? new Date(raw) : now
  return Number.isNaN(d.getTime()) ? now : d
}

export function isProActive(profile: any, now: Date = new Date()): boolean {
  if (profile?.is_pro !== true) return false
  if (!profile?.pro_until) return false
  const until = new Date(profile.pro_until)
  if (Number.isNaN(until.getTime())) return false
  return until.getTime() > now.getTime()
}

export function getMasterAccess(profile: any, now: Date = new Date()): MasterAccess {
  const trialStartAt = getTrialStartAt(profile, now)
  const trialEndsAt = getTrialEndsAt(trialStartAt)
  const isTrial = now.getTime() < trialEndsAt.getTime()
  const isPro = isProActive(profile, now)
  return { isPro, isTrial, trialEndsAt }
}

export function formatRemaining(ms: number): { days: number; hours: number; minutes: number } {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return { days, hours, minutes }
}

export function getCooldownRemainingMs(lastAt: string | Date | null | undefined, cooldownDays = 3): number {
  if (!lastAt) return 0
  const last = typeof lastAt === 'string' ? new Date(lastAt) : lastAt
  if (Number.isNaN(last.getTime())) return 0
  const nextAllowed = last.getTime() + cooldownDays * DAY_MS
  return Math.max(0, nextAllowed - Date.now())
}

