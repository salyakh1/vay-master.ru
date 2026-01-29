import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

const ITEMS_PER_PAGE = 20

/**
 * GET /api/search/masters?q=&city=&spec=&service=&page=1
 * Единая точка поиска мастеров: текст, город (геокод + зона обслуживания), специализация, услуга.
 * Без параметров не вызывать — при отсутствии фильтров клиент использует fetchRandomProfiles.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const city = (searchParams.get('city') || '').trim()
    const spec = searchParams.get('spec') || ''
    const service = searchParams.get('service') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    let profileIds: string[] | null = null

    // Текст: поиск по специализациям и услугам
    if (q) {
      const [specRes, serviceRes] = await Promise.all([
        supabaseAdmin.from('specializations').select('id').ilike('name', `%${q}%`),
        supabaseAdmin.from('services').select('id').ilike('name', `%${q}%`),
      ])
      const specIds = (specRes.data || []).map((s: { id: string }) => s.id)
      const serviceIds = (serviceRes.data || []).map((s: { id: string }) => s.id)

      let profileIdsFromSpecs: string[] = []
      let profileIdsFromServices: string[] = []
      if (specIds.length > 0) {
        const { data: ps } = await supabaseAdmin
          .from('profile_specializations')
          .select('profile_id')
          .in('specialization_id', specIds)
        profileIdsFromSpecs = (ps || []).map((p: { profile_id: string }) => p.profile_id)
      }
      if (serviceIds.length > 0) {
        const { data: psv } = await supabaseAdmin
          .from('profile_services')
          .select('profile_id')
          .in('service_id', serviceIds)
        profileIdsFromServices = (psv || []).map((p: { profile_id: string }) => p.profile_id)
      }
      const allIds = Array.from(new Set([...profileIdsFromSpecs, ...profileIdsFromServices]))
      if (allIds.length > 0) profileIds = allIds
    }

    // Фильтр по выбранной специализации или услуге
    let filteredIds: string[] | null = null
    if (service) {
      const { data } = await supabaseAdmin
        .from('profile_services')
        .select('profile_id')
        .eq('service_id', service)
      filteredIds = (data || []).map((r: { profile_id: string }) => r.profile_id)
    } else if (spec) {
      const { data } = await supabaseAdmin
        .from('profile_specializations')
        .select('profile_id')
        .eq('specialization_id', spec)
      filteredIds = (data || []).map((r: { profile_id: string }) => r.profile_id)
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
        const origin = request.nextUrl.origin
        const geoRes = await fetch(`${origin}/api/geocode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: city }),
        })
        const geo = await geoRes.json()
        if (geo?.lat != null && geo?.lng != null) {
          const locRes = await fetch(
            `${origin}/api/masters/serve-location?lat=${encodeURIComponent(geo.lat)}&lng=${encodeURIComponent(geo.lng)}`
          )
          const loc = await locRes.json()
          if (Array.isArray(loc?.profileIds)) serveIds = loc.profileIds
        }
      } catch {
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
      return NextResponse.json({ masters: [], hasMore: false })
    }

    let queryBuilder = supabaseAdmin
      .from('profiles')
      .select(
        `
        *,
        profile_specializations (
          specialization:specializations (id, name, slug)
        ),
        profile_services (
          service:services (id, name, slug, specialization_id)
        ),
        master_rating,
        master_reviews_count
      `,
        { count: 'exact' }
      )
      .eq('role', 'master')
      .range(from, to)

    if (q && !profileIds) {
      queryBuilder = queryBuilder.or(
        `full_name.ilike.%${q}%,description.ilike.%${q}%`
      )
    }
    if (finalProfileIds && finalProfileIds.length > 0) {
      queryBuilder = queryBuilder.in('id', finalProfileIds)
    }

    const { data: masters, error, count } = await queryBuilder

    if (error) throw error

    const list = (masters || []) as any[]
    const hasMore = list.length === ITEMS_PER_PAGE && (count || 0) > page * ITEMS_PER_PAGE

    return NextResponse.json({ masters: list, hasMore })
  } catch (e) {
    console.error('search/masters error:', e)
    return NextResponse.json(
      { error: 'Ошибка поиска мастеров' },
      { status: 500 }
    )
  }
}
