import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export interface ServiceNode {
  id: string
  name: string
  slug: string
  sort_order: number
}

export interface SubcategoryNode {
  id: string
  category_id: string
  name: string
  slug: string
  image_url?: string | null
  sort_order: number
  services: ServiceNode[]
}

export interface CategoryNode {
  id: string
  name: string
  slug: string
  image_url?: string | null
  sort_order: number
  subcategories: SubcategoryNode[]
}

/**
 * GET /api/master-categories/tree
 * Дерево категорий → подкатегории → услуги для фильтра и выбора мастеров.
 */
export async function GET() {
  try {
    const [catsRes, subsRes, svcRes] = await Promise.all([
      supabaseAdmin.from('categories').select('id, name, slug, image_url, sort_order').order('sort_order').order('name'),
      supabaseAdmin.from('subcategories').select('id, category_id, name, slug, image_url, sort_order').order('sort_order').order('name'),
      supabaseAdmin.from('services').select('id, subcategory_id, name, slug, sort_order').order('sort_order').order('name'),
    ])

    if (catsRes.error || subsRes.error || svcRes.error) {
      return NextResponse.json({ error: 'Failed to load tree' }, { status: 500 })
    }

    const cats = (catsRes.data || []) as CategoryNode[]
    const subs = (subsRes.data || []) as SubcategoryNode[]
    type ServiceRow = ServiceNode & { subcategory_id: string; sort_order?: number }
    const svc = (svcRes.data || []) as ServiceRow[]

    const servicesBySub: Record<string, ServiceNode[]> = {}
    for (const s of svc) {
      const list = servicesBySub[s.subcategory_id] || []
      list.push({ id: s.id, name: s.name, slug: s.slug, sort_order: s.sort_order ?? 0 })
      servicesBySub[s.subcategory_id] = list
    }

    const subsByCat: Record<string, SubcategoryNode[]> = {}
    for (const sub of subs) {
      const list = subsByCat[sub.category_id] || []
      list.push({
        id: sub.id,
        category_id: sub.category_id,
        name: sub.name,
        slug: sub.slug,
        image_url: sub.image_url ?? null,
        sort_order: sub.sort_order ?? 0,
        services: (servicesBySub[sub.id] || []).sort((a, b) => a.sort_order - b.sort_order),
      })
      subsByCat[sub.category_id] = list
    }

    const tree: CategoryNode[] = cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image_url: c.image_url ?? null,
      sort_order: c.sort_order ?? 0,
      subcategories: (subsByCat[c.id] || []).sort((a, b) => a.sort_order - b.sort_order),
    })).sort((a, b) => a.sort_order - b.sort_order)

    const res = NextResponse.json({ tree })
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return res
  } catch (e) {
    console.error('master-categories/tree:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
