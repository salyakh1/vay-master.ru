import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || 'home'
    const limit = parseInt(searchParams.get('limit') || '10')

    const now = new Date().toISOString()

    // Получаем активные баннеры
    const { data, error } = await supabase
      .from('ad_banners')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(limit * 2) // Получаем больше, чтобы после фильтрации осталось достаточно

    if (error) {
      console.error('Error fetching banners:', error)
      return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 })
    }

    // Фильтруем по странице и датам на стороне сервера
    const filteredBanners = (data || []).filter((banner: any) => {
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

      return true
    }).slice(0, limit) // Ограничиваем до нужного количества

    return NextResponse.json({ banners: filteredBanners })
  } catch (error) {
    console.error('Error in banners API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

