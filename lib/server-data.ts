import { createClient } from '@supabase/supabase-js'
import type { AdBanner } from './supabase'
import { filterProductionBanners } from './banner-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/** Серверный клиент для RSC — без Data Cache Next.js (баннеры должны пропадать сразу после удаления). */
function getServerSupabase() {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false },
    global: {
      fetch: (url, options = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  })
}

/** Баннеры для первой отрисовки (SSR). Логика как в /api/banners. */
export async function getBannersForPage(
  page: 'home' | 'search' | 'orders' | 'products' | 'feed',
  limit = 10
): Promise<AdBanner[]> {
  const supabase = getServerSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('ad_banners')
    .select('*')
    .eq('is_active', true)
    .or('ad_type.eq.HERO_SPONSORED,ad_type.is.null')
    .order('priority', { ascending: false })
    .limit(limit * 2)

  if (error) return []

  const filtered = (data || []).filter((banner: any) => {
    if (banner.ad_type && banner.ad_type !== 'HERO_SPONSORED') return false
    if (!banner.pages || !Array.isArray(banner.pages) || !banner.pages.includes(page)) return false
    const startDate = banner.start_date ? new Date(banner.start_date) : null
    const endDate = banner.end_date ? new Date(banner.end_date) : null
    const nowDate = new Date(now)
    if (startDate && startDate > nowDate) return false
    if (endDate && endDate < nowDate) return false
    if (banner.impression_limit && banner.current_impressions >= banner.impression_limit) return false
    if (banner.click_limit && banner.current_clicks >= banner.click_limit) return false
    return true
  }).slice(0, limit) as AdBanner[]

  return filterProductionBanners(filtered)
}

export interface MasterCategoryWithCount {
  id: string
  name: string
  slug: string
  image_url?: string | null
  masters_count: number
}

/** Категории мастеров с количеством для первого экрана главной. */
export async function getMasterCategoriesWithCounts(): Promise<{
  categories: MasterCategoryWithCount[]
  total_masters: number
}> {
  const supabase = getServerSupabase()

  const [catsRes, pscRes, profilesRes] = await Promise.all([
    supabase.from('categories').select('id, name, slug, image_url').order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('profile_subcategories').select('profile_id, subcategory_id'),
    supabase.from('profiles').select('id, role').eq('role', 'master'),
  ])

  if (catsRes.error) return { categories: [], total_masters: 0 }

  const [subRes] = await Promise.all([
    supabase.from('subcategories').select('id, category_id'),
  ])
  if (subRes.error) return { categories: [], total_masters: 0 }

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

  const categories: MasterCategoryWithCount[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image_url: c.image_url ?? null,
    masters_count: profileIdsByCategory[c.id]?.size ?? 0,
  })).sort((a, b) => b.masters_count - a.masters_count)

  return { categories, total_masters: masterIds.size }
}
