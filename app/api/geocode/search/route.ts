import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Поиск адресов через Nominatim (автодополнение)
export async function GET(req: NextRequest) {
  const { success } = rateLimit(`geocode-search:${getClientIp(req)}`, 40, 60_000)
  if (!success) return rateLimitResponse()

  try {
    const searchParams = req.nextUrl.searchParams
    const query = searchParams.get('q')?.trim() || ''

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Nominatim search API (для автодополнения)
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}&addressdetails=1&accept-language=ru`
    
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ru',
        'User-Agent': 'VayMaster/1.0 (address-search)',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ results: [] })
    }

    const json = (await res.json()) as any[]
    
    const results = json
      .filter((item) => {
        const lat = Number(item?.lat)
        const lng = Number(item?.lon)
        return Number.isFinite(lat) && Number.isFinite(lng)
      })
      .map((item) => ({
        display_name: item.display_name || '',
        lat: Number(item.lat),
        lng: Number(item.lon),
        address: item.address || {},
      }))

    return NextResponse.json({ results })
  } catch (e: any) {
    console.error('Geocode search error:', e)
    return NextResponse.json({ results: [] })
  }
}
