import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const dynamic = 'force-dynamic'

function normalizeQuery(q: string) {
  return q.trim().replace(/\s+/g, ' ')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const queryRaw = typeof body?.query === 'string' ? body.query : ''
    const query = normalizeQuery(queryRaw)

    if (!query) {
      return NextResponse.json({ error: 'query обязателен' }, { status: 400 })
    }

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'GEOCODING backend is not configured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 1) cache hit
    const { data: cached } = await supabaseAdmin
      .from('geocoding_cache')
      .select('lat,lng,label,source')
      .eq('query', query)
      .maybeSingle()

    if (cached?.lat != null && cached?.lng != null) {
      return NextResponse.json({
        lat: cached.lat,
        lng: cached.lng,
        label: cached.label || null,
        source: cached.source || 'cache',
        cacheHit: true,
      })
    }

    // 2) nominatim
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ru',
        // Nominatim policy: identify your app via UA (minimal)
        'User-Agent': 'VayMaster/1.0 (geocode)',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })
    }

    const json = (await res.json()) as any[]
    const first = json?.[0]
    const lat = Number(first?.lat)
    const lng = Number(first?.lon)
    const label = first?.display_name ? String(first.display_name) : null

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // upsert cache (ignore errors)
    await supabaseAdmin
      .from('geocoding_cache')
      .upsert(
        {
          query,
          lat,
          lng,
          label,
          source: 'nominatim',
        },
        { onConflict: 'query' }
      )

    return NextResponse.json({ lat, lng, label, source: 'nominatim', cacheHit: false })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

