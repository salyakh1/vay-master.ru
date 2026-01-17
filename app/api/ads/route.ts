import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const adType = searchParams.get('type')
    const page = searchParams.get('page')
    const city = searchParams.get('city')
    const masterId = searchParams.get('masterId')
    const specialization = searchParams.get('specialization')
    
    // Парсим массивы из JSON
    let category: string[] | null = null
    let keywords: string[] | null = null
    
    const categoryParam = searchParams.get('category')
    if (categoryParam) {
      try {
        category = JSON.parse(categoryParam)
      } catch (e) {
        console.error('Error parsing category:', e)
      }
    }
    
    const keywordsParam = searchParams.get('keywords')
    if (keywordsParam) {
      try {
        keywords = JSON.parse(keywordsParam)
      } catch (e) {
        console.error('Error parsing keywords:', e)
      }
    }

    if (!adType) {
      return NextResponse.json({ error: 'Ad type is required' }, { status: 400 })
    }

    const now = new Date().toISOString()

    // Для INLINE_CONTEXT возвращаем несколько реклам (до 5), для остальных - одну
    const limit = adType === 'INLINE_CONTEXT' ? 5 : 1

    // Используем функцию из БД для получения контекстной рекламы
    const { data, error } = await supabase.rpc('get_contextual_ads', {
      p_page: page || null,
      p_category: category,
      p_keywords: keywords,
      p_city: city,
      p_ad_type: adType,
      p_limit: limit,
    })

    if (error) {
      console.error('Error fetching contextual ads:', error)
      // Fallback: используем прямой запрос, если функция не работает
      return await getAdsFallback(adType, page, category, keywords, city, masterId, specialization, limit)
    }

    if (data && data.length > 0) {
      // Для INLINE_CONTEXT возвращаем массив, для остальных - одну рекламу
      if (adType === 'INLINE_CONTEXT') {
        return NextResponse.json({ ads: data })
      } else {
        return NextResponse.json({ ad: data[0] })
      }
    }

    return NextResponse.json(adType === 'INLINE_CONTEXT' ? { ads: [] } : { ad: null })
  } catch (error) {
    console.error('Error in ads API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Fallback функция, если RPC не работает
async function getAdsFallback(
  adType: string,
  page: string | null,
  category: string[] | null,
  keywords: string[] | null,
  city: string | null,
  masterId: string | null,
  specialization: string | null,
  limit: number = 1
) {
  try {
    const now = new Date().toISOString()

    let query = supabase
      .from('ad_banners')
      .select('*')
      .eq('is_active', true)
      .eq('ad_type', adType)
      .order('priority', { ascending: false })
      .limit(limit > 1 ? limit * 2 : 10) // Берем больше для фильтрации

    // Фильтр по странице
    if (page) {
      query = query.contains('pages', [page])
    }

    // Фильтр по датам
    query = query.or(`start_date.is.null,start_date.lte.${now}`)
    query = query.or(`end_date.is.null,end_date.gte.${now}`)

    // Фильтр по мастеру (для PROFILE_RELATED)
    if (masterId) {
      query = query.or(`target_id.eq.${masterId},target_type.is.null`)
    }

    // Фильтр по специализации
    if (specialization) {
      query = query.or(`category.cs.{${specialization}},keywords.cs.{${specialization}}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error in fallback query:', error)
      return NextResponse.json({ ad: null })
    }

    // Фильтруем по лимитам, регионам, категориям и ключевым словам на клиенте
    const filtered = (data || []).filter((ad: any) => {
      // Проверяем лимиты
      if (ad.impression_limit && ad.current_impressions >= ad.impression_limit) {
        return false
      }
      if (ad.click_limit && ad.current_clicks >= ad.click_limit) {
        return false
      }

      // Проверяем регион
      if (ad.regions && ad.regions.length > 0) {
        if (!ad.regions.includes('ALL')) {
          if (!city || !ad.regions.includes(city)) {
            return false
          }
        }
      }

      // Проверяем категории - если у рекламы указаны категории, они должны совпадать
      // Если категории не указаны в рекламе, показываем её (универсальная реклама)
      if (ad.category && ad.category.length > 0 && category && category.length > 0) {
        const hasMatch = category.some((cat: string) => ad.category.includes(cat))
        if (!hasMatch) {
          return false
        }
      }

      // Проверяем ключевые слова - если у рекламы указаны ключевые слова, они должны совпадать
      // Если ключевые слова не указаны в рекламе, показываем её
      if (ad.keywords && ad.keywords.length > 0 && keywords && keywords.length > 0) {
        const hasMatch = keywords.some((kw: string) => 
          ad.keywords.some((adKw: string) => adKw.toLowerCase().includes(kw.toLowerCase()))
        )
        if (!hasMatch) {
          return false
        }
      }

      // Проверка по мастеру (для PROFILE_RELATED)
      if (masterId && adType === 'PROFILE_RELATED') {
        // Если указан masterId, реклама должна быть либо связана с этим мастером, либо универсальной
        if (ad.target_id && ad.target_id !== masterId) {
          return false
        }
      }

      // Проверка по специализации (для PROFILE_RELATED)
      if (specialization && adType === 'PROFILE_RELATED') {
        const adCategories = ad.category || []
        const adKeywords = ad.keywords || []
        const hasMatch = adCategories.includes(specialization) || 
                        adKeywords.some((kw: string) => kw.toLowerCase().includes(specialization.toLowerCase()))
        // Если у рекламы есть категории/ключевые слова, они должны совпадать
        // Если нет, показываем универсальную рекламу
        if ((adCategories.length > 0 || adKeywords.length > 0) && !hasMatch) {
          return false
        }
      }

      return true
    })

    // Ограничиваем количество реклам
    const limitedAds = filtered.slice(0, limit)

    if (limitedAds.length > 0) {
      // Для INLINE_CONTEXT возвращаем массив, для остальных - одну рекламу
      if (adType === 'INLINE_CONTEXT') {
        return NextResponse.json({ ads: limitedAds })
      } else {
        return NextResponse.json({ ad: limitedAds[0] })
      }
    }

    return NextResponse.json(adType === 'INLINE_CONTEXT' ? { ads: [] } : { ad: null })
  } catch (error) {
    console.error('Error in fallback:', error)
    return NextResponse.json({ ad: null })
  }
}
