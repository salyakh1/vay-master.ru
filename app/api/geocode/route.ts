import { NextRequest, NextResponse } from 'next/server'
import { geocodeQuery } from '@/lib/geocode-server'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { success } = rateLimit(`geocode:${getClientIp(req)}`, 30, 60_000)
  if (!success) return rateLimitResponse()

  try {
    const body = await req.json().catch(() => ({}))
    const queryRaw = typeof body?.query === 'string' ? body.query : ''
    if (!queryRaw.trim()) {
      return NextResponse.json({ error: 'query обязателен' }, { status: 400 })
    }

    const result = await geocodeQuery(queryRaw)
    return NextResponse.json(result)
  } catch (e: any) {
    const msg = e?.message || 'Internal error'
    if (msg === 'Not found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (msg === 'Geocoding failed') {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })
    }
    if (msg.includes('not configured')) {
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    console.error('geocode error:', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
