import type { SupabaseClient } from '@supabase/supabase-js'

/** Серверная запись воронки. Не бросает, если таблицы ещё нет. */
export async function insertFunnelEvent(
  admin: SupabaseClient,
  name: string,
  userId?: string | null,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    await admin.from('funnel_events').insert({
      name,
      user_id: userId ?? null,
      properties: properties || {},
    })
  } catch (e) {
    console.warn('funnel_events', e)
  }
}
