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
 * GET /api/search/masters?q=&city=&category=&subcategory=&service=&page=1
 * Поиск мастеров: текст, город, категория, подкатегория, услуга.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const city = (searchParams.get('city') || '').trim()
    let category = searchParams.get('category') || ''
    const subcategory = searchParams.get('subcategory') || ''
    const serviceParam = searchParams.get('service') || ''
    const serviceIds = serviceParam ? serviceParam.split(',').map((s) => s.trim()).filter(Boolean) : []
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

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
        profile_subcategories (
          subcategory:subcategories (id, name, slug, category:categories (id, name, slug))
        ),
        profile_services (
          service:services (id, name, slug, subcategory:subcategories (id, name, slug, category:categories (id, name, slug)))
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
