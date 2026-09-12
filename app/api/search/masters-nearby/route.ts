import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { haversineKm } from '@/lib/geo'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

const ITEMS_PER_PAGE = 20
const DEFAULT_RADIUS_KM = 25
const MAX_RADIUS_KM = 200

/**
 * GET /api/search/masters-nearby?lat=43.13&lng=45.54&radius_km=25&page=1
 * Мастера, чьи координаты (master_lat, master_lng) попадают в радиус radius_km от точки (lat, lng).
 * Сортировка по расстоянию, пагинация.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    const unbounded = searchParams.get('unbounded') === '1'
    const radiusKm = unbounded
      ? Number.POSITIVE_INFINITY
      : Math.min(
          MAX_RADIUS_KM,
          Math.max(1, Number(searchParams.get('radius_km')) || DEFAULT_RADIUS_KM)
        )
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE), 10))
    )

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: 'Параметры lat и lng обязательны' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('profiles')
      .select(
        `
        *,
        profile_subcategories (
          subcategory:subcategories (id, name, slug, category:categories (id, name, slug))
        ),
        profile_services (
          price,
          price_unit,
          service:services (id, name, slug, subcategory:subcategories (id, name, slug, category:categories (id, name, slug)))
        ),
        master_rating,
        master_reviews_count
      `
      )
      .eq('role', 'master')
      .not('master_lat', 'is', null)
      .not('master_lng', 'is', null)

    if (Number.isFinite(radiusKm)) {
      const deg = radiusKm / 111
      const degLng = radiusKm / (111 * Math.max(0.3, Math.cos((lat * Math.PI) / 180)))
      query = query
        .gte('master_lat', lat - deg)
        .lte('master_lat', lat + deg)
        .gte('master_lng', lng - degLng)
        .lte('master_lng', lng + degLng)
    }

    const { data: list, error } = await query

    if (error) throw error

    const withDistance = (list || []).map((m: any) => {
      const dist = haversineKm(lat, lng, Number(m.master_lat), Number(m.master_lng))
      return { ...m, _distance_km: dist }
    })
    const inRadius = Number.isFinite(radiusKm)
      ? withDistance.filter((m) => m._distance_km <= radiusKm)
      : withDistance
    inRadius.sort((a, b) => a._distance_km - b._distance_km)

    const from = (page - 1) * limit
    const pageSlice = inRadius.slice(from, from + limit)
    const masters = pageSlice.map(({ _distance_km, ...rest }) => ({
      ...rest,
      distance_km: Math.round(_distance_km * 10) / 10,
    }))
    const hasMore = inRadius.length > from + limit

    return NextResponse.json({ masters, hasMore, total: inRadius.length })
  } catch (e) {
    console.error('masters-nearby error:', e)
    return NextResponse.json(
      { error: 'Ошибка поиска мастеров рядом' },
      { status: 500 }
    )
  }
}
