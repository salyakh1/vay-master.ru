import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

/** Расстояние между двумя точками (гаверсинус), км */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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
 * GET /api/masters/serve-location?lat=43.13&lng=45.54
 * Возвращает id мастеров, чья зона обслуживания (master_lat, master_lng, service_radius_km) покрывает точку (lat, lng).
 * Нужно для поиска: "город Урус-Мартан" -> показать и мастеров из Грозного, чей радиус покрывает Урус-Мартан.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: 'Параметры lat и lng обязательны и должны быть числами' },
        { status: 400 }
      )
    }

    const { data: masters, error } = await supabaseAdmin
      .from('profiles')
      .select('id, master_lat, master_lng, service_radius_km')
      .eq('role', 'master')
      .not('master_lat', 'is', null)
      .not('master_lng', 'is', null)
      .not('service_radius_km', 'is', null)

    if (error) throw error

    const radiusKmDefault = 50
    const profileIds: string[] = []

    for (const m of masters || []) {
      const mLat = Number(m.master_lat)
      const mLng = Number(m.master_lng)
      const radiusKm = Number(m.service_radius_km) || radiusKmDefault
      if (!Number.isFinite(mLat) || !Number.isFinite(mLng) || radiusKm <= 0) continue
      const dist = haversineKm(lat, lng, mLat, mLng)
      if (dist <= radiusKm) {
        profileIds.push(m.id)
      }
    }

    return NextResponse.json({ profileIds })
  } catch (e) {
    console.error('serve-location error:', e)
    return NextResponse.json(
      { error: 'Ошибка при поиске мастеров по локации' },
      { status: 500 }
    )
  }
}
