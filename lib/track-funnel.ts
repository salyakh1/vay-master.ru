/** Клиентский трекинг воронки. Не бросает — аналитика не должна ломать UX. */

const NAMES = [
  'view_search',
  'click_master',
  'register_role',
  'create_order',
  'pay_publish',
  'respond',
  'accept',
  'complete',
  'review',
] as const

export type FunnelEventName = (typeof NAMES)[number]

export async function trackFunnel(
  name: FunnelEventName,
  properties?: Record<string, unknown>
): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    await fetch('/api/events', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, properties: properties || {} }),
    })
  } catch {
    /* ignore */
  }
}
