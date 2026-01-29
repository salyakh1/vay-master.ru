import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 12

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const masterLat = Number(searchParams.get('masterLat'))
    const masterLng = Number(searchParams.get('masterLng'))
    const radiusKm = Number(searchParams.get('radiusKm') || 50)
    const limit = Math.min(Number(searchParams.get('limit') || DEFAULT_LIMIT), 20)

    // Проверка параметров
    if (!masterLat || !masterLng || !Number.isFinite(masterLat) || !Number.isFinite(masterLng)) {
      return NextResponse.json({ error: 'masterLat и masterLng обязательны' }, { status: 400 })
    }

    if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
      return NextResponse.json({ error: 'radiusKm должен быть положительным числом' }, { status: 400 })
    }

    // Получаем всех продавцов с координатами (зона обслуживания мастера — любые продавцы в радиусе)
    const { data: sellersWithCoords, error: sellersError } = await supabaseAdmin
      .from('profiles')
      .select('id, seller_lat, seller_lng')
      .eq('role', 'seller')
      .not('seller_lat', 'is', null)
      .not('seller_lng', 'is', null)

    if (sellersError) throw sellersError

    if (!sellersWithCoords || sellersWithCoords.length === 0) {
      return NextResponse.json({ items: [] })
    }

    // Фильтруем продавцов по зоне обслуживания мастера (расстояние от точки выезда мастера до магазина продавца <= radiusKm)
    const sellersInRadius: string[] = []

    for (const seller of sellersWithCoords) {
      const { data: distanceData, error: distanceError } = await supabaseAdmin.rpc(
        'calculate_distance_km',
        {
          lat1: masterLat,
          lng1: masterLng,
          lat2: seller.seller_lat,
          lng2: seller.seller_lng,
        }
      )

      if (!distanceError && distanceData !== null && Number(distanceData) <= radiusKm) {
        sellersInRadius.push(seller.id)
      }
    }

    if (sellersInRadius.length === 0) {
      return NextResponse.json({ items: [] })
    }

    // Получаем товары от продавцов в радиусе
    const { data: products, error: productsError } = await supabaseAdmin
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
        seller:profiles(id, full_name, avatar_url, city, seller_lat, seller_lng, store_address, is_pro, pro_until),
        category_ref:product_categories(id, name, section, slug),
        subcategory_ref:product_subcategories(id, name, slug, category_id)
      `
      )
      .eq('in_stock', true)
      .in('seller_id', sellersInRadius)
      .order('created_at', { ascending: false })
      .limit(limit * 2) // Берем больше, чтобы потом отсортировать по расстоянию

    if (productsError) throw productsError

    // Вычисляем расстояние для каждого товара и сортируем
    const productsWithDistance = await Promise.all(
      (products || []).map(async (product: any) => {
        const seller = product.seller
        if (!seller?.seller_lat || !seller?.seller_lng) {
          return { product, distance: Infinity }
        }

        const { data: distance } = await supabaseAdmin.rpc('calculate_distance_km', {
          lat1: masterLat,
          lng1: masterLng,
          lat2: seller.seller_lat,
          lng2: seller.seller_lng,
        })

        return {
          product,
          distance: distance !== null ? Number(distance) : Infinity,
        }
      })
    )

    // Сортируем по расстоянию и берем первые limit
    const sortedProducts = productsWithDistance
      .filter((item) => item.distance !== Infinity)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map((item) => ({
        ...item.product,
        distance_km: Math.round(item.distance * 10) / 10, // Округляем до 0.1 км
      }))

    return NextResponse.json({ items: sortedProducts })
  } catch (error: any) {
    console.error('recommendations/nearby', error)
    return NextResponse.json({ error: error?.message || 'Ошибка' }, { status: 500 })
  }
}
