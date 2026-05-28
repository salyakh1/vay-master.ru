import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { success } = rateLimit(getClientIp(request), 60, 60_000)
  if (!success) return rateLimitResponse()

  try {
    const searchParams = request.nextUrl.searchParams
    const query = (searchParams.get('q') || '').trim().toLowerCase()
    const type = searchParams.get('type') || 'all'
    const forSearch = searchParams.get('for') === 'search'
    const forProducts = searchParams.get('for') === 'products'

    if (!query || query.length < 2) {
      return NextResponse.json(
        forSearch ? { suggestions: [], main: null, services: [] } : forProducts ? { suggestions: [] } : { suggestions: [] }
      )
    }

    // Режим «поиск товаров»: 1 категория/подкатегория каталога + 3 товара (с названием категории)
    if (forProducts) {
      const mainList: Array<{ id: string; name: string; type: 'category' | 'subcategory' }> = []
      const productsList: Array<{ id: string; name: string; category_name: string | null }> = []

      const [subRes, catRes, prodRes] = await Promise.all([
        supabase.from('product_subcategories').select('id, name').ilike('name', `%${query}%`).limit(1),
        supabase.from('product_categories').select('id, name').ilike('name', `%${query}%`).limit(1),
        supabase
          .from('products')
          .select('id, name, product_categories(name)')
          .ilike('name', `%${query}%`)
          .eq('in_stock', true)
          .limit(3),
      ])

      if (subRes.data?.length) {
        mainList.push(...subRes.data.map((s) => ({ id: s.id, name: s.name, type: 'subcategory' as const })))
      }
      if (catRes.data?.length && mainList.length === 0) {
        mainList.push(...catRes.data.map((c) => ({ id: c.id, name: c.name, type: 'category' as const })))
      }
      if (prodRes.data?.length) {
        for (const row of prodRes.data as any[]) {
          const catName = row.product_categories?.name ?? null
          productsList.push({ id: row.id, name: row.name, category_name: catName })
        }
      }

      const mainOne = mainList[0] ?? null
      const suggestions = [
        ...(mainOne ? [{ id: mainOne.id, name: mainOne.name, type: mainOne.type, category_name: null as string | null }] : []),
        ...productsList.map((p) => ({ id: p.id, name: p.name, type: 'product' as const, category_name: p.category_name })),
      ]
      return NextResponse.json({ suggestions })
    }

    // Режим «поиск мастеров»: 1 подсказка (категория/подкатегория) + 3 услуги (с названием категории)
    if (forSearch) {
      const mainList: Array<{ id: string; name: string; type: 'category' | 'subcategory' }> = []
      const servicesList: Array<{ id: string; name: string; category_name: string | null }> = []

      const [subRes, catRes, svcRes] = await Promise.all([
        supabase.from('subcategories').select('id, name').ilike('name', `%${query}%`).limit(1),
        supabase.from('categories').select('id, name').ilike('name', `%${query}%`).limit(1),
        supabase
          .from('services')
          .select('id, name, subcategory:subcategories(id, category:categories(id, name))')
          .ilike('name', `%${query}%`)
          .limit(3),
      ])

      if (subRes.data?.length) {
        mainList.push(...subRes.data.map((s) => ({ id: s.id, name: s.name, type: 'subcategory' as const })))
      }
      if (catRes.data?.length && mainList.length === 0) {
        mainList.push(...catRes.data.map((c) => ({ id: c.id, name: c.name, type: 'category' as const })))
      }
      if (svcRes.data?.length) {
        for (const row of svcRes.data as any[]) {
          const catName = row.subcategory?.category?.name ?? null
          servicesList.push({ id: row.id, name: row.name, category_name: catName })
        }
      }

      const mainOne = mainList[0] ?? null
      const suggestions = [
        ...(mainOne ? [{ id: mainOne.id, name: mainOne.name, type: mainOne.type, category_name: null as string | null }] : []),
        ...servicesList.map((s) => ({ id: s.id, name: s.name, type: 'service' as const, category_name: s.category_name })),
      ]
      return NextResponse.json({ suggestions, main: mainOne, services: servicesList })
    }

    const suggestions: Array<{
      id: string
      name: string
      type: 'master' | 'product' | 'service' | 'category' | 'subcategory'
    }> = []

    // Поиск мастеров
    if (type === 'all' || type === 'master') {
      try {
        const { data: masters } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'master')
          .ilike('full_name', `%${query}%`)
          .limit(5)

        if (masters) {
          suggestions.push(
            ...masters.map((m) => ({
              id: m.id,
              name: m.full_name,
              type: 'master' as const,
            }))
          )
        }
      } catch (error) {
        console.error('Error fetching masters:', error)
      }
    }

    // Поиск товаров
    if (type === 'all' || type === 'product') {
      try {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .ilike('name', `%${query}%`)
          .eq('in_stock', true)
          .limit(5)

        if (products) {
          suggestions.push(
            ...products.map((p) => ({
              id: p.id,
              name: p.name,
              type: 'product' as const,
            }))
          )
        }
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    }

    // Поиск услуг
    if (type === 'all' || type === 'master') {
      try {
        const { data: services } = await supabase
          .from('services')
          .select('id, name')
          .ilike('name', `%${query}%`)
          .limit(5)

        if (services) {
          suggestions.push(
            ...services.map((s) => ({
              id: s.id,
              name: s.name,
              type: 'service' as const,
            }))
          )
        }
      } catch (error) {
        console.error('Error fetching services:', error)
      }
    }

    // Поиск категорий и подкатегорий мастеров
    if (type === 'all' || type === 'master') {
      try {
        const [catRes, subRes] = await Promise.all([
          supabase.from('categories').select('id, name').ilike('name', `%${query}%`).limit(3),
          supabase.from('subcategories').select('id, name').ilike('name', `%${query}%`).limit(3),
        ])
        if (catRes.data?.length) {
          suggestions.push(
            ...catRes.data.map((c) => ({ id: c.id, name: c.name, type: 'category' as const }))
          )
        }
        if (subRes.data?.length) {
          suggestions.push(
            ...subRes.data.map((s) => ({ id: s.id, name: s.name, type: 'subcategory' as const }))
          )
        }
      } catch (error) {
        console.error('Error fetching categories/subcategories:', error)
      }
    }

    // Ограничиваем общее количество подсказок
    return NextResponse.json({ suggestions: suggestions.slice(0, 10) })
  } catch (error) {
    console.error('Error in autocomplete API:', error)
    return NextResponse.json({ suggestions: [] }, { status: 500 })
  }
}

