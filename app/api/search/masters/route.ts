import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { haversineKm } from '@/lib/geo'
import { stripPhone } from '@/lib/guest-access'
import { geocodeQuery } from '@/lib/geocode-server'
import { findMasterIdsServingLocation } from '@/lib/masters-serve-location'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

export const dynamic = 'force-dynamic'

const ITEMS_PER_PAGE = 20
const MAX_LOCATION_FETCH = 2000

async function isAuthenticatedRequest(request: NextRequest): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const token =
      cookieStore.get('sb-access-token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return false

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
    const { data: { user }, error } = await supabaseClient.auth.getUser()
    return !error && !!user
  } catch {
    return false
  }
}

function sanitizeMastersForGuest<T extends { phone?: string | null }>(
  masters: T[],
  isAuthenticated: boolean
): T[] {
  if (isAuthenticated) return masters
  return masters.map((m) => stripPhone(m) as T)
}

const PROFILE_SELECT = `
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

/**
 * GET /api/search/masters?q=&city=&category=&subcategory=&service=&lat=&lng=&radius_km=&page=1
 * Поиск мастеров: текст, фильтры, опционально сортировка по расстоянию.
 */
export async function GET(request: NextRequest) {
  const { success } = rateLimit(getClientIp(request), 60, 60_000)
  if (!success) return rateLimitResponse()

  try {
    const { searchParams } = new URL(request.url)
    const isAuthenticated = await isAuthenticatedRequest(request)
    const q = (searchParams.get('q') || '').trim()
    const city = (searchParams.get('city') || '').trim()
    let category = searchParams.get('category') || ''
    const subcategory = searchParams.get('subcategory') || ''
    const serviceParam = searchParams.get('service') || ''
    const serviceIds = serviceParam ? serviceParam.split(',').map((s) => s.trim()).filter(Boolean) : []
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE), 10))
    )
    const lat = Number(searchParams.get('lat'))
    const lng = Number(searchParams.get('lng'))
    const hasLocation = Number.isFinite(lat) && Number.isFinite(lng)
    const radiusKm = Math.min(200, Math.max(1, Number(searchParams.get('radius_km')) || 50))
    const hasTextOrFilters = !!(q || city || category || subcategory || serviceIds.length > 0)

    const from = (page - 1) * limit

    let profileIds: string[] | null = null

    // Текст: поиск по категориям, подкатегориям и услугам
    if (q) {
      const [catRes, subRes, svcRes] = await Promise.all([
        supabaseAdmin.from('categories').select('id').ilike('name', `%${q}%`),
        supabaseAdmin.from('subcategories').select('id').ilike('name', `%${q}%`),
        supabaseAdmin.from('services').select('id').ilike('name', `%${q}%`),
      ])
      const catIds = (catRes.data || []).map((c: { id: string }) => c.id)
      const subIds = (subRes.data || []).map((s: { id: string }) => s.id)
      const svcIds = (svcRes.data || []).map((s: { id: string }) => s.id)

      let fromCats: string[] = []
      let fromSubs: string[] = []
      let fromSvc: string[] = []
      if (catIds.length > 0) {
        const subsInCats = await supabaseAdmin.from('subcategories').select('id').in('category_id', catIds)
        const subIdsInCats = (subsInCats.data || []).map((s: { id: string }) => s.id)
        if (subIdsInCats.length > 0) {
          const { data: psc } = await supabaseAdmin
            .from('profile_subcategories')
            .select('profile_id')
            .in('subcategory_id', subIdsInCats)
          fromCats = (psc || []).map((p: { profile_id: string }) => p.profile_id)
        }
      }
      if (subIds.length > 0) {
        const { data: psc } = await supabaseAdmin
          .from('profile_subcategories')
          .select('profile_id')
          .in('subcategory_id', subIds)
        fromSubs = (psc || []).map((p: { profile_id: string }) => p.profile_id)
      }
      if (svcIds.length > 0) {
        const { data: psv } = await supabaseAdmin
          .from('profile_services')
          .select('profile_id')
          .in('service_id', svcIds)
        fromSvc = (psv || []).map((p: { profile_id: string }) => p.profile_id)
      }
      const allIds = Array.from(new Set([...fromCats, ...fromSubs, ...fromSvc]))
      if (allIds.length > 0) profileIds = allIds
    }

    // Фильтр по категории / подкатегории / услуге (несколько услуг — мастера с любой из выбранных)
    let filteredIds: string[] | null = null
    if (serviceIds.length > 0) {
      const allIds: string[] = []
      for (const sid of serviceIds) {
        const { data } = await supabaseAdmin
          .from('profile_services')
          .select('profile_id')
          .eq('service_id', sid)
        allIds.push(...(data || []).map((r: { profile_id: string }) => r.profile_id))
      }
      filteredIds = allIds.length > 0 ? Array.from(new Set(allIds)) : []
    } else if (subcategory) {
      const { data } = await supabaseAdmin
        .from('profile_subcategories')
        .select('profile_id')
        .eq('subcategory_id', subcategory)
      filteredIds = (data || []).map((r: { profile_id: string }) => r.profile_id)
    } else if (category) {
      const { data: subs } = await supabaseAdmin
        .from('subcategories')
        .select('id')
        .eq('category_id', category)
      const subIds = (subs || []).map((s: { id: string }) => s.id)
      if (subIds.length > 0) {
        const { data } = await supabaseAdmin
          .from('profile_subcategories')
          .select('profile_id')
          .in('subcategory_id', subIds)
        filteredIds = (data || []).map((r: { profile_id: string }) => r.profile_id)
      }
    }

    let finalProfileIds: string[] | null = null
    if (profileIds && filteredIds) {
      finalProfileIds = profileIds.filter((id) => filteredIds!.includes(id))
    } else if (profileIds) {
      finalProfileIds = profileIds
    } else if (filteredIds) {
      finalProfileIds = filteredIds
    }

    // Город: мастера из города ИЛИ зона обслуживания покрывает город
    if (city) {
      let cityMatchIds: string[] = []
      const { data: cityData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'master')
        .ilike('city', `%${city}%`)
      cityMatchIds = (cityData || []).map((r: { id: string }) => r.id)

      let serveIds: string[] = []
      try {
        const geo = await geocodeQuery(city)
        if (geo?.lat != null && geo?.lng != null) {
          serveIds = await findMasterIdsServingLocation(Number(geo.lat), Number(geo.lng))
        }
      } catch (geoErr) {
        console.error('search/masters geocode/serve-location failed:', geoErr)
        // оставляем только cityMatchIds
      }
      const locationIds = Array.from(new Set([...cityMatchIds, ...serveIds]))
      if (locationIds.length > 0) {
        finalProfileIds = finalProfileIds
          ? finalProfileIds.filter((id) => locationIds.includes(id))
          : locationIds
      } else {
        finalProfileIds = []
      }
    }

    if (finalProfileIds && finalProfileIds.length === 0) {
      return NextResponse.json({ masters: [], hasMore: false, total: 0 })
    }

    let queryBuilder = supabaseAdmin
      .from('profiles')
      .select(PROFILE_SELECT, hasLocation ? undefined : { count: 'exact' })
      .eq('role', 'master')

    if (q && !profileIds) {
      queryBuilder = queryBuilder.or(
        `full_name.ilike.%${q}%,description.ilike.%${q}%`
      )
    }
    if (finalProfileIds && finalProfileIds.length > 0) {
      queryBuilder = queryBuilder.in('id', finalProfileIds)
    }

    if (hasLocation) {
      const { data: masters, error } = await queryBuilder.limit(MAX_LOCATION_FETCH)
      if (error) throw error

      let list = (masters || []).map((m: any) => {
        const mLat = m.master_lat != null ? Number(m.master_lat) : NaN
        const mLng = m.master_lng != null ? Number(m.master_lng) : NaN
        const distance_km =
          Number.isFinite(mLat) && Number.isFinite(mLng)
            ? Math.round(haversineKm(lat, lng, mLat, mLng) * 10) / 10
            : null
        return { ...m, distance_km }
      })

      if (!hasTextOrFilters) {
        list = list.filter((m) => m.distance_km == null || m.distance_km <= radiusKm)
      }

      list.sort((a, b) => {
        const da = a.distance_km ?? Number.POSITIVE_INFINITY
        const db = b.distance_km ?? Number.POSITIVE_INFINITY
        if (da !== db) return da - db
        return (b.master_rating ?? 0) - (a.master_rating ?? 0)
      })

      const total = list.length
      const pageSlice = sanitizeMastersForGuest(list.slice(from, from + limit), isAuthenticated)
      const hasMore = from + limit < total
      return NextResponse.json({ masters: pageSlice, hasMore, total })
    }

    queryBuilder = queryBuilder.range(from, from + limit - 1)

    const { data: masters, error, count } = await queryBuilder

    if (error) throw error

    const list = sanitizeMastersForGuest((masters || []) as any[], isAuthenticated)
    list.sort((a, b) => (b.master_rating ?? 0) - (a.master_rating ?? 0))
    const hasMore = list.length === limit && (count || 0) > page * limit

    return NextResponse.json({ masters: list, hasMore, total: count || 0 })
  } catch (e) {
    console.error('search/masters error:', e)
    return NextResponse.json(
      { error: 'Ошибка поиска мастеров' },
      { status: 500 }
    )
  }
}
