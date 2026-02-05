import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export interface SpecializationWithCount {
  id: string
  name: string
  slug: string
  masters_count: number
  image_url?: string | null
}

/**
 * GET /api/specializations/with-counts
 * Обратная совместимость: возвращает категории мастеров (categories) в формате «специализаций».
 * Для нового кода используйте /api/master-categories/with-counts.
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

    const subsRes = await supabaseAdmin.from('subcategories').select('id, category_id')
    if (subsRes.error) {
      console.error('subcategories error:', subsRes.error)
      return NextResponse.json({ error: 'Failed to load subcategories' }, { status: 500 })
    }

    const cats = (catsRes.data || []) as { id: string; name: string; slug: string; image_url?: string | null }[]
    const subs = (subsRes.data || []) as { id: string; category_id: string }[]
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

    const result: SpecializationWithCount[] = cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      masters_count: profileIdsByCategory[c.id]?.size ?? 0,
      image_url: c.image_url ?? null,
    })).sort((a, b) => b.masters_count - a.masters_count)

    const totalMasters = masterIds.size
    return NextResponse.json({ specializations: result, total_masters: totalMasters })
  } catch (e) {
    console.error('specializations/with-counts:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
