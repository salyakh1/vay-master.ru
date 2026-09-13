import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { haversineKm } from '@/lib/geo'
import { interleaveByCategoryOrder, normalizeCity } from '@/lib/product-task-rank'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 12
const NO_GEO_SELLER_CAP = 80

function parseSlugs(raw: string | null): string[] {
  return (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

type SellerRow = {
  id: string
  seller_lat: number | null
  seller_lng: number | null
  city: string | null
}

type RankedNearbyItem = Record<string, unknown> & {
  created_at?: unknown
  city_match: boolean
  distance_km: number | undefined
  category_ref?: { slug?: string | null } | { slug?: string | null }[] | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const masterLat = Number(searchParams.get('masterLat'))
    const masterLng = Number(searchParams.get('masterLng'))
    const unbounded = searchParams.get('unbounded') === '1'
    const radiusKm = Number(searchParams.get('radiusKm') || 50)
    const limit = Math.min(Number(searchParams.get('limit') || DEFAULT_LIMIT), 40)
    const q = (searchParams.get('q') || '').trim()
    const city = searchParams.get('city') || ''
    const categorySlugs = parseSlugs(searchParams.get('categorySlugs'))
    const subcategorySlugs = parseSlugs(searchParams.get('subcategorySlugs'))
    const requireTaskMatch = searchParams.get('requireTaskMatch') === '1'

    if (!masterLat || !masterLng || !Number.isFinite(masterLat) || !Number.isFinite(masterLng)) {
      return NextResponse.json({ error: 'masterLat и masterLng обязательны' }, { status: 400 })
    }

    if (!unbounded && (!Number.isFinite(radiusKm) || radiusKm <= 0)) {
      return NextResponse.json({ error: 'radiusKm должен быть положительным числом' }, { status: 400 })
    }

    if (requireTaskMatch && categorySlugs.length === 0 && subcategorySlugs.length === 0) {
      return NextResponse.json({ items: [] })
    }

    let sellersQuery = supabaseAdmin
      .from('profiles')
      .select('id, seller_lat, seller_lng, city')
      .eq('role', 'seller')

    if (!requireTaskMatch) {
      sellersQuery = sellersQuery.not('seller_lat', 'is', null).not('seller_lng', 'is', null)
    }

    const { data: sellersWithCoords, error: sellersError } = await sellersQuery
    if (sellersError) throw sellersError

    const userCity = normalizeCity(city)
    const distanceBySeller = new Map<string, number>()
    const cityMatchBySeller = new Map<string, boolean>()
    const inRadius: string[] = []
    const noGeo: Array<{ id: string; cityMatch: boolean }> = []

    for (const seller of (sellersWithCoords || []) as SellerRow[]) {
      const lat = seller.seller_lat == null ? null : Number(seller.seller_lat)
      const lng = seller.seller_lng == null ? null : Number(seller.seller_lng)
      const cityMatch = userCity.length > 0 && normalizeCity(seller.city) === userCity
      cityMatchBySeller.set(seller.id, cityMatch)

      if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
        const distance = haversineKm(masterLat, masterLng, lat, lng)
        if (unbounded || (Number.isFinite(distance) && distance <= radiusKm)) {
          distanceBySeller.set(seller.id, distance)
          inRadius.push(seller.id)
        }
        continue
      }

      if (requireTaskMatch || unbounded) {
        noGeo.push({ id: seller.id, cityMatch })
      }
    }

    noGeo.sort((a, b) => Number(b.cityMatch) - Number(a.cityMatch))
    const noGeoIds = noGeo.slice(0, NO_GEO_SELLER_CAP).map((s) => s.id)
    const sellerIds = requireTaskMatch || unbounded ? [...inRadius, ...noGeoIds] : inRadius

    if (sellerIds.length === 0) {
      return NextResponse.json({ items: [] })
    }

    let categoryIds: string[] = []
    let subcategoryIds: string[] = []

    if (categorySlugs.length > 0) {
      const { data: categoriesData } = await supabaseAdmin
        .from('product_categories')
        .select('id')
        .in('slug', categorySlugs)
      categoryIds = (categoriesData || []).map((c) => c.id)
    }

    if (subcategorySlugs.length > 0) {
      const { data: subcategoriesData } = await supabaseAdmin
        .from('product_subcategories')
        .select('id')
        .in('slug', subcategorySlugs)
      subcategoryIds = (subcategoriesData || []).map((s) => s.id)
    }

    if (requireTaskMatch && categoryIds.length === 0 && subcategoryIds.length === 0) {
      return NextResponse.json({ items: [] })
    }

    let query = supabaseAdmin
      .from('products')
      .select(
        `
        id,
        name,
        price,
        images,
        created_at,
        rating,
        reviews_count,
        category_id,
        subcategory_id,
        seller_id,
        seller:profiles(id, full_name, avatar_url, city, seller_lat, seller_lng, store_address, is_pro, pro_until),
        category_ref:product_categories(id, name, section, slug),
        subcategory_ref:product_subcategories(id, name, slug, category_id)
      `
      )
      .eq('in_stock', true)
      .in('seller_id', sellerIds)
      .order('created_at', { ascending: false })
      .limit(Math.max(limit * 8, 120))

    if (categoryIds.length > 0 && subcategoryIds.length > 0) {
      query = query.or(`category_id.in.(${categoryIds.join(',')}),subcategory_id.in.(${subcategoryIds.join(',')})`)
    } else if (categoryIds.length > 0) {
      query = query.in('category_id', categoryIds)
    } else if (subcategoryIds.length > 0) {
      query = query.in('subcategory_id', subcategoryIds)
    }

    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    }

    const { data: products, error: productsError } = await query
    if (productsError) throw productsError

    const ranked: RankedNearbyItem[] = (products || []).map((product: Record<string, unknown>) => {
      const sellerId = product.seller_id as string
      const distance = distanceBySeller.get(sellerId)
      return {
        ...product,
        created_at: product.created_at,
        category_ref: product.category_ref as RankedNearbyItem['category_ref'],
        distance_km: distance != null ? Math.round(distance * 10) / 10 : undefined,
        city_match: cityMatchBySeller.get(sellerId) === true,
      }
    })
      .sort((a, b) => {
        const aDist = a.distance_km
        const bDist = b.distance_km
        if (aDist != null && bDist != null && aDist !== bDist) return aDist - bDist
        if (aDist != null && bDist == null) return -1
        if (aDist == null && bDist != null) return 1
        if (a.city_match !== b.city_match) return a.city_match ? -1 : 1
        return String(b.created_at).localeCompare(String(a.created_at))
      })

    const sortedProducts = requireTaskMatch
      ? interleaveByCategoryOrder(ranked, categorySlugs, limit)
      : ranked.slice(0, limit)

    const items = sortedProducts.map(({ city_match: _cityMatch, ...item }) => item)

    return NextResponse.json({ items })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ошибка'
    console.error('recommendations/nearby', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
