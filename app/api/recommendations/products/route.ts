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
    const q = (searchParams.get('q') || '').trim()
    
    // Поддержка одиночных ID (для обратной совместимости)
    const categoryId = (searchParams.get('categoryId') || '').trim()
    const subcategoryId = (searchParams.get('subcategoryId') || '').trim()
    
    // Поддержка массивов ID (для рекомендаций по специализациям)
    const categoryIdsParam = searchParams.get('categoryIds')
    const subcategoryIdsParam = searchParams.get('subcategoryIds')
    
    // Поддержка slug категорий (для рекомендаций по специализациям)
    const categorySlugsParam = searchParams.get('categorySlugs')
    const subcategorySlugsParam = searchParams.get('subcategorySlugs')
    
    const limit = Math.min(Number(searchParams.get('limit') || DEFAULT_LIMIT), 20)

    const now = new Date().toISOString()

    const { data: proSellers, error: proError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'seller')
      .or(`is_pro.eq.true,pro_until.gt.${now}`)
      .limit(500)

    if (proError) throw proError
    const sellerIds = (proSellers || []).map((item) => item.id)

    if (sellerIds.length === 0) {
      return NextResponse.json({ items: [] })
    }

    // Собираем все categoryIds
    const categoryIds: string[] = []
    if (categoryId) {
      categoryIds.push(categoryId)
    }
    if (categoryIdsParam) {
      const ids = categoryIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
      categoryIds.push(...ids)
    }
    
    // Собираем все subcategoryIds
    const subcategoryIds: string[] = []
    if (subcategoryId) {
      subcategoryIds.push(subcategoryId)
    }
    if (subcategoryIdsParam) {
      const ids = subcategoryIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
      subcategoryIds.push(...ids)
    }

    // Конвертируем slug в ID, если переданы slug
    if (categorySlugsParam) {
      const slugs = categorySlugsParam.split(',').map((slug) => slug.trim()).filter(Boolean)
      if (slugs.length > 0) {
        const { data: categoriesData } = await supabaseAdmin
          .from('product_categories')
          .select('id')
          .in('slug', slugs)
        
        if (categoriesData) {
          const ids = categoriesData.map((cat) => cat.id)
          categoryIds.push(...ids)
        }
      }
    }

    if (subcategorySlugsParam) {
      const slugs = subcategorySlugsParam.split(',').map((slug) => slug.trim()).filter(Boolean)
      if (slugs.length > 0) {
        const { data: subcategoriesData } = await supabaseAdmin
          .from('product_subcategories')
          .select('id')
          .in('slug', slugs)
        
        if (subcategoriesData) {
          const ids = subcategoriesData.map((subcat) => subcat.id)
          subcategoryIds.push(...ids)
        }
      }
    }

    // Убираем дубликаты
    const uniqueCategoryIds = Array.from(new Set(categoryIds))
    const uniqueSubcategoryIds = Array.from(new Set(subcategoryIds))

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
        seller:profiles(id, full_name, avatar_url, city, is_pro, pro_until),
        category_ref:product_categories(id, name, section, slug),
        subcategory_ref:product_subcategories(id, name, slug, category_id)
      `
      )
      .eq('in_stock', true)
      .in('seller_id', sellerIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Фильтрация по категориям
    if (uniqueCategoryIds.length > 0) {
      query = query.in('category_id', uniqueCategoryIds)
    }

    // Фильтрация по подкатегориям
    if (uniqueSubcategoryIds.length > 0) {
      query = query.in('subcategory_id', uniqueSubcategoryIds)
    }

    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ items: data || [] })
  } catch (error: any) {
    console.error('recommendations/products', error)
    return NextResponse.json({ error: error?.message || 'Ошибка' }, { status: 500 })
  }
}
