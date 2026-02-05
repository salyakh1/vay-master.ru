import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] })
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

