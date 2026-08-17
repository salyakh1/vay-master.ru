import { NextRequest, NextResponse } from 'next/server'
import { getBearerUser, getServiceClient } from '@/lib/api-auth'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const ALLOWED = new Set([
  'view_search',
  'click_master',
  'register_role',
  'create_order',
  'pay_publish',
  'respond',
  'accept',
  'complete',
  'complete_requested',
  'review',
])

export async function POST(request: NextRequest) {
  const { success } = rateLimit(`events:${getClientIp(request)}`, 60, 60_000)
  if (!success) return rateLimitResponse()

  let body: { name?: string; properties?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name : ''
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ error: 'Unknown event' }, { status: 400 })
  }

  const user = await getBearerUser(request)
  const admin = getServiceClient()
  const { error } = await admin.from('funnel_events').insert({
    name,
    user_id: user?.id ?? null,
    properties: body.properties && typeof body.properties === 'object' ? body.properties : {},
  })

  if (error) {
    console.warn('funnel_events insert', error.message)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
  return NextResponse.json({ ok: true })
}
