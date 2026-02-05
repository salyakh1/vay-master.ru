import { supabase } from '@/lib/supabase'
import type { AdBanner } from '@/lib/supabase'

const DEFAULT_LIMIT = 10

/**
 * Серверная загрузка баннеров для первой отрисовки (SSR).
 * Используется в Server Components для быстрого LCP.
 */
export async function getBannersForPage(
  page: 'home' | 'search' | 'orders' | 'products' | 'feed',
  limit: number = DEFAULT_LIMIT
): Promise<AdBanner[]> {
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
    if (banner.impression_limit != null && banner.current_impressions >= banner.impression_limit) return false
    if (banner.click_limit != null && banner.current_clicks >= banner.click_limit) return false
    return true
  }).slice(0, limit)

  return filtered as AdBanner[]
}
