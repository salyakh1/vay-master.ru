import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

const ITEMS_PER_PAGE = 20
const DEFAULT_RADIUS_KM = 25
const MAX_RADIUS_KM = 200

/** Расстояние между двумя точками (гаверсинус), км */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

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
    const radiusKm = Math.min(
      MAX_RADIUS_KM,
      Math.max(1, Number(searchParams.get('radius_km')) || DEFAULT_RADIUS_KM)
    )
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: 'Параметры lat и lng обязательны' },
        { status: 400 }
      )
    }

    // Грубая bounding box (~1° ≈ 111 km) чтобы не тянуть всех мастеров
    const deg = radiusKm / 111
    const degLng = radiusKm / (111 * Math.max(0.3, Math.cos((lat * Math.PI) / 180)))
    const minLat = lat - deg
    const maxLat = lat + deg
    const minLng = lng - degLng
    const maxLng = lng + degLng

    const { data: list, error } = await supabaseAdmin
      .from('profiles')
      .select(
        `
        *,
        profile_subcategories (
          subcategory:subcategories (id, name, slug, category:categories (id, name, slug))
        ),
        profile_services (
          service:services (id, name, slug, subcategory:subcategories (id, name, slug, category:categories (id, name, slug)))
        ),
        master_rating,
        master_reviews_count
      `
      )
      .eq('role', 'master')
      .not('master_lat', 'is', null)
      .not('master_lng', 'is', null)
      .gte('master_lat', minLat)
      .lte('master_lat', maxLat)
      .gte('master_lng', minLng)
      .lte('master_lng', maxLng)

    if (error) throw error

    const withDistance = (list || []).map((m: any) => {
      const dist = haversineKm(lat, lng, Number(m.master_lat), Number(m.master_lng))
      return { ...m, _distance_km: dist }
    })
    const inRadius = withDistance.filter((m) => m._distance_km <= radiusKm)
    inRadius.sort((a, b) => a._distance_km - b._distance_km)

    const from = (page - 1) * ITEMS_PER_PAGE
    const pageSlice = inRadius.slice(from, from + ITEMS_PER_PAGE)
    const masters = pageSlice.map(({ _distance_km, ...rest }) => ({
      ...rest,
      distance_km: Math.round(_distance_km * 10) / 10,
    }))
    const hasMore = inRadius.length > from + ITEMS_PER_PAGE

    return NextResponse.json({ masters, hasMore, total: inRadius.length })
  } catch (e) {
    console.error('masters-nearby error:', e)
    return NextResponse.json(
      { error: 'Ошибка поиска мастеров рядом' },
      { status: 500 }
    )
  }
}
