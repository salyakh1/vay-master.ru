import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export interface MasterCategoryWithCount {
  id: string
  name: string
  slug: string
  image_url?: string | null
  masters_count: number
}

/**
 * GET /api/master-categories/with-counts
 * Список категорий мастеров (верхний уровень) с количеством мастеров.
 */
export async function GET() {
  try {
    const [catsRes, pscRes, profilesRes] = await Promise.all([
      supabaseAdmin.from('categories').select('id, name, slug, image_url').order('sort_order', { ascending: true }).order('name', { ascending: true }),
      supabaseAdmin.from('profile_subcategories').select('profile_id, subcategory_id'),
      supabaseAdmin.from('profiles').select('id, role').eq('role', 'master'),
    ])

    if (catsRes.error) {
      console.error('categories error:', catsRes.error)
      return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
    }

    const [subRes] = await Promise.all([
      supabaseAdmin.from('subcategories').select('id, category_id'),
    ])
    if (subRes.error) {
      console.error('subcategories error:', subRes.error)
      return NextResponse.json({ error: 'Failed to load subcategories' }, { status: 500 })
    }

    const cats = (catsRes.data || []) as { id: string; name: string; slug: string; image_url?: string | null }[]
    const subs = (subRes.data || []) as { id: string; category_id: string }[]
    const psc = (pscRes.data || []) as { profile_id: string; subcategory_id: string }[]
    const masterIds = new Set((profilesRes.data || []).map((p: { id: string }) => p.id))

    const subToCat: Record<string, string> = {}
    for (const s of subs) subToCat[s.id] = s.category_id

    const profileIdsByCategory: Record<string, Set<string>> = {}
    for (const row of psc) {
      if (!masterIds.has(row.profile_id)) continue
      const catId = subToCat[row.subcategory_id]
      if (!catId) continue
      if (!profileIdsByCategory[catId]) profileIdsByCategory[catId] = new Set()
      profileIdsByCategory[catId].add(row.profile_id)
    }

    const result: MasterCategoryWithCount[] = cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image_url: c.image_url ?? null,
      masters_count: profileIdsByCategory[c.id]?.size ?? 0,
    })).sort((a, b) => b.masters_count - a.masters_count)

    const totalMasters = masterIds.size
    const res = NextResponse.json({ categories: result, total_masters: totalMasters })
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return res
  } catch (e) {
    console.error('master-categories/with-counts:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
