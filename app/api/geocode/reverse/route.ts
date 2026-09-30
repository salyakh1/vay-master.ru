import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** GET /api/geocode/reverse?lat=..&lng=.. → { city, label } через Nominatim */
export async function GET(req: NextRequest) {
  const { success } = rateLimit(`geocode-reverse:${getClientIp(req)}`, 30, 60_000)
  if (!success) return rateLimitResponse()

  const lat = Number(req.nextUrl.searchParams.get('lat'))
  const lng = Number(req.nextUrl.searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'lat и lng обязательны' }, { status: 400 })
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1&accept-language=ru`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ru',
        'User-Agent': 'VayMaster/1.0 (reverse-geocode)',
      },
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ city: null, label: null })

    const json = (await res.json()) as {
      display_name?: string
      address?: Record<string, string | undefined>
    }
    const a = json.address || {}
    const city = a.city || a.town || a.village || a.municipality || a.county || a.state || null
    const street = [a.road, a.house_number].filter(Boolean).join(', ')
    const label = [city, street].filter(Boolean).join(', ') || json.display_name || null

    return NextResponse.json({ city, label })
  } catch (e) {
    console.error('Geocode reverse error:', e)
    return NextResponse.json({ city: null, label: null })
  }
}
