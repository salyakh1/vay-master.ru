import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type GeocodeResult = {
  lat: number
  lng: number
  label: string | null
  source: string
  cacheHit: boolean
}

function normalizeQuery(q: string) {
  return q.trim().replace(/\s+/g, ' ')
}

function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('GEOCODING backend is not configured')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Прямой геокодинг без HTTP self-fetch (cache → Nominatim). */
export async function geocodeQuery(queryRaw: string): Promise<GeocodeResult> {
  const query = normalizeQuery(queryRaw)
  if (!query) {
    throw new Error('query обязателен')
  }

  const supabaseAdmin = getAdmin()

  const { data: cached } = await supabaseAdmin
    .from('geocoding_cache')
    .select('lat,lng,label,source')
    .eq('query', query)
    .maybeSingle()

  if (cached?.lat != null && cached?.lng != null) {
    return {
      lat: Number(cached.lat),
      lng: Number(cached.lng),
      label: cached.label || null,
      source: cached.source || 'cache',
      cacheHit: true,
    }
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'ru',
      'User-Agent': 'VayMaster/1.0 (geocode)',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('Geocoding failed')
  }

  const json = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>
  const first = json?.[0]
  const lat = Number(first?.lat)
  const lng = Number(first?.lon)
  const label = first?.display_name ? String(first.display_name) : null

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Not found')
  }

  await supabaseAdmin.from('geocoding_cache').upsert(
    { query, lat, lng, label, source: 'nominatim' },
    { onConflict: 'query' }
  )

  return { lat, lng, label, source: 'nominatim', cacheHit: false }
}
