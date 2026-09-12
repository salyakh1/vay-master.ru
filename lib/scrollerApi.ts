import type { Product, User } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

export const SCROLLER_PAGE_SIZE = 15
export const LIST_PAGE_SIZE = 6

export type MasterScrollerItem = User & {
  distance_km?: number
  profile_subcategories?: Array<{ subcategory?: { name?: string } }>
  profile_services?: Array<{
    price?: number | string | null
    price_unit?: string | null
    service?: { id?: string; name?: string | null; slug?: string | null }
  }>
}
export type ProductScrollerItem = Product & { distance_km?: number }

export type MastersFetchParams = {
  page: number
  limit?: number
  q?: string
  city?: string
  category?: string
  subcategory?: string
  service?: string
  lat?: number | null
  lng?: number | null
  radiusKm?: number | null
}

export type ProductsFetchParams = {
  page: number
  q?: string
  city?: string | null
  categoryId?: string
  subcategoryIds?: string[]
  lat?: number | null
  lng?: number | null
  radiusKm?: number | null
  categorySlugs?: string[]
  subcategorySlugs?: string[]
  requireTaskMatch?: boolean
}

export async function fetchMastersPage(
  params: MastersFetchParams
): Promise<{ items: MasterScrollerItem[]; total: number; hasMore: boolean }> {
  const { page, limit = SCROLLER_PAGE_SIZE, lat, lng, radiusKm, q, city, category, subcategory, service } =
    params

  const sp = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (q?.trim()) sp.set('q', q.trim())
  if (city?.trim()) sp.set('city', city.trim())
  if (category) sp.set('category', category)
  if (subcategory) sp.set('subcategory', subcategory)
  if (service) sp.set('service', service)
  if (lat != null && lng != null) {
    sp.set('lat', String(lat))
    sp.set('lng', String(lng))
    if (radiusKm != null) sp.set('radius_km', String(radiusKm))
    else sp.set('unbounded', '1')
  }

  const { data: { session } } = await supabase.auth.getSession()
  const headers: HeadersInit = {}
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  const res = await fetch(`/api/search/masters?${sp}`, { headers })
  if (!res.ok) return { items: [], total: 0, hasMore: false }
  const data = await res.json()
  const items = (data.masters || []) as MasterScrollerItem[]
  const total = data.total ?? items.length
  return { items, total, hasMore: !!data.hasMore }
}

export async function fetchProductsScrollerPage(
  params: ProductsFetchParams
): Promise<{ items: ProductScrollerItem[]; total: number; hasMore: boolean }> {
  const { lat, lng, radiusKm, limit = SCROLLER_PAGE_SIZE, page = 1, requireTaskMatch } = params as ProductsFetchParams & {
    limit?: number
  }

  const hasTaskFilter = Boolean(params.categorySlugs?.length || params.subcategorySlugs?.length || params.q?.trim())
  if (requireTaskMatch && !hasTaskFilter) {
    return { items: [], total: 0, hasMore: false }
  }

  if (lat != null && lng != null) {
    const sp = new URLSearchParams({
      masterLat: String(lat),
      masterLng: String(lng),
      limit: String(limit * page),
    })
    if (radiusKm != null) sp.set('radiusKm', String(radiusKm))
    else sp.set('unbounded', '1')
    if (params.q?.trim()) sp.set('q', params.q.trim())
    if (params.city?.trim()) sp.set('city', params.city.trim())
    if (params.categorySlugs?.length) sp.set('categorySlugs', params.categorySlugs.join(','))
    if (params.subcategorySlugs?.length) sp.set('subcategorySlugs', params.subcategorySlugs.join(','))
    if (requireTaskMatch) sp.set('requireTaskMatch', '1')
    const res = await fetch(`/api/recommendations/nearby?${sp}`)
    if (!res.ok) return { items: [], total: 0, hasMore: false }
    const data = await res.json()
    const all = (data.items || []) as ProductScrollerItem[]
    const from = (page - 1) * limit
    const slice = all.slice(from, from + limit)
    return { items: slice, total: all.length, hasMore: from + limit < all.length }
  }

  const sp = new URLSearchParams({ limit: String(limit * page) })
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.categorySlugs?.length) sp.set('categorySlugs', params.categorySlugs.join(','))
  if (params.subcategorySlugs?.length) sp.set('subcategorySlugs', params.subcategorySlugs.join(','))

  const res = await fetch(`/api/recommendations/products?${sp}`)
  if (!res.ok) return { items: [], total: 0, hasMore: false }
  const data = await res.json()
  const all = (data.items || []) as ProductScrollerItem[]
  const from = (page - 1) * limit
  const slice = all.slice(from, from + limit)
  return { items: slice, total: all.length, hasMore: from + limit < all.length }
}
