import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterProductionBanners } from '@/lib/banner-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || 'home'
    const limit = parseInt(searchParams.get('limit') || '10')

    const now = new Date().toISOString()

    // Получаем активные баннеры ТОЛЬКО типа HERO_SPONSORED (или без типа для обратной совместимости)
    // AdBannerSlider предназначен только для Hero рекламы
    let query = supabase
      .from('ad_banners')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(limit * 2)

    // Фильтруем по типу: только HERO_SPONSORED или без типа (для старых баннеров)
    query = query.or('ad_type.eq.HERO_SPONSORED,ad_type.is.null')

    const { data, error } = await query

    if (error) {
      console.error('Error fetching banners:', error)
      return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 })
    }

    // Фильтруем по странице и датам на стороне сервера
    const filteredBanners = (data || []).filter((banner: any) => {
      // Проверяем тип - только HERO_SPONSORED или без типа
      if (banner.ad_type && banner.ad_type !== 'HERO_SPONSORED') {
        return false
      }

      // Проверяем, содержит ли массив pages нужную страницу
      if (!banner.pages || !Array.isArray(banner.pages) || !banner.pages.includes(page)) {
        return false
      }

      // Фильтруем по датам
      const startDate = banner.start_date ? new Date(banner.start_date) : null
      const endDate = banner.end_date ? new Date(banner.end_date) : null
      const nowDate = new Date(now)

      if (startDate && startDate > nowDate) return false
      if (endDate && endDate < nowDate) return false

      // Проверяем лимиты
      if (banner.impression_limit && banner.current_impressions >= banner.impression_limit) {
        return false
      }
      if (banner.click_limit && banner.current_clicks >= banner.click_limit) {
        return false
      }

      return true
    }).slice(0, limit) // Ограничиваем до нужного количества

    const banners = filterProductionBanners(filteredBanners as any[])

    const res = NextResponse.json({ banners })
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    return res
  } catch (error) {
    console.error('Error in banners API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

