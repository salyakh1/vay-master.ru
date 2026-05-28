import type { SupabaseClient } from '@supabase/supabase-js'

/** Продлевает PRO на указанное число дней от max(сейчас, pro_until). */
export async function extendProByDays(
  admin: SupabaseClient,
  userId: string,
  days: number
): Promise<{ pro_until: string }> {
  if (!Number.isFinite(days) || days <= 0 || days > 3650) {
    throw new Error('Некорректный период')
  }

  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, pro_until')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  if (!profile) throw new Error('Профиль не найден')

  const now = new Date()
  const base = profile.pro_until ? new Date(profile.pro_until as string) : now
  const baseTime = Number.isNaN(base.getTime()) ? now.getTime() : Math.max(now.getTime(), base.getTime())
  const newUntil = new Date(baseTime + days * 24 * 60 * 60 * 1000)

  const { error: uErr } = await admin
    .from('profiles')
    .update({
      is_pro: true,
      pro_until: newUntil.toISOString(),
    })
    .eq('id', userId)

  if (uErr) throw uErr
  return { pro_until: newUntil.toISOString() }
}
