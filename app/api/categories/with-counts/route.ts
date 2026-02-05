import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export interface CategoryWithCount {
  id: string
  name: string
  slug: string
  section: string
  products_count: number
}

/**
 * GET /api/categories/with-counts
 * Список категорий каталога с количеством товаров.
 */
export async function GET() {
  try {
    const [catsRes, productsRes] = await Promise.all([
      supabaseAdmin.from('product_categories').select('id, name, slug, section').order('name', { ascending: true }),
      supabaseAdmin.from('products').select('category_id'),
    ])

    if (catsRes.error) {
      console.error('product_categories error:', catsRes.error)
      return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
    }

    const cats = (catsRes.data || []) as { id: string; name: string; slug: string; section: string }[]
    const products = (productsRes.data || []) as { category_id: string | null }[]

    const countByCategory: Record<string, number> = {}
    for (const p of products) {
      if (!p.category_id) continue
      countByCategory[p.category_id] = (countByCategory[p.category_id] || 0) + 1
    }

    const result: CategoryWithCount[] = cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      section: c.section,
      products_count: countByCategory[c.id] || 0,
    }))

    return NextResponse.json({ categories: result })
  } catch (e) {
    console.error('categories/with-counts:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
