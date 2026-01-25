import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

// Маппинг материалов к специализациям/услугам
const materialToSpecializations: Record<string, string[]> = {
  // Материалы для стен
  'primer': ['Грунтовка', 'Отделочные работы'],
  'putty': ['Шпаклевка', 'Отделочные работы'],
  'lime_mortar': ['Штукатурка', 'Отделочные работы'],
  'wallpaper': ['Поклейка обоев', 'Отделочные работы'],
  'paint': ['Покраска', 'Отделочные работы'],
  'decorative_plaster': ['Декоративная штукатурка', 'Отделочные работы'],
  'tile': ['Укладка плитки', 'Отделочные работы'],
  'panels': ['Монтаж панелей', 'Отделочные работы'],
  'drywall': ['Монтаж гипсокартона', 'Отделочные работы'],
  // Материалы для пола
  'concrete': ['Бетонные работы', 'Стяжка пола'],
  'screed': ['Стяжка пола', 'Бетонные работы'],
  'liquid_floor': ['Заливка пола', 'Бетонные работы'],
  'laminate': ['Укладка ламината', 'Напольные покрытия'],
  'parquet': ['Укладка паркета', 'Напольные покрытия'],
  'tile_floor': ['Укладка плитки', 'Отделочные работы'],
  'linoleum': ['Укладка линолеума', 'Напольные покрытия'],
  'carpet': ['Укладка ковролина', 'Напольные покрытия'],
  'self_leveling': ['Заливка пола', 'Бетонные работы'],
  'wood': ['Укладка деревянного пола', 'Напольные покрытия'],
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('material_id')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!materialId) {
      return NextResponse.json({ error: 'material_id is required' }, { status: 400 })
    }

    // Получаем специализации для материала
    const specializations = materialToSpecializations[materialId] || []
    
    if (specializations.length === 0) {
      return NextResponse.json({ masters: [] })
    }

    // Ищем мастеров с этими специализациями
    const { data: specializationsData, error: specError } = await supabaseAdmin
      .from('specializations')
      .select('id, name')
      .in('name', specializations)

    if (specError) {
      console.error('Error fetching specializations:', specError)
      return NextResponse.json({ masters: [] })
    }

    if (!specializationsData || specializationsData.length === 0) {
      return NextResponse.json({ masters: [] })
    }

    const specializationIds = specializationsData.map(s => s.id)

    // Находим профили с этими специализациями
    const { data: profileSpecs, error: profileSpecsError } = await supabaseAdmin
      .from('profile_specializations')
      .select('profile_id')
      .in('specialization_id', specializationIds)

    if (profileSpecsError) {
      console.error('Error fetching profile specializations:', profileSpecsError)
      return NextResponse.json({ masters: [] })
    }

    if (!profileSpecs || profileSpecs.length === 0) {
      return NextResponse.json({ masters: [] })
    }

    const profileIds = Array.from(new Set(profileSpecs.map((ps: any) => ps.profile_id)))

    // Получаем мастеров с их данными
    const { data: mastersData, error: mastersError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        city,
        description,
        master_rating,
        master_reviews_count,
        profile_specializations (
          specialization:specializations (id, name, slug)
        )
      `)
      .eq('role', 'master')
      .in('id', profileIds)
      .order('master_rating', { ascending: false })
      .limit(limit)

    if (mastersError) {
      console.error('Error fetching masters:', mastersError)
      return NextResponse.json({ masters: [] })
    }

    // Форматируем данные
    const masters = (mastersData || []).map((master: any) => ({
      id: master.id,
      full_name: master.full_name,
      avatar_url: master.avatar_url,
      city: master.city,
      description: master.description,
      rating: master.master_rating || 0,
      reviews_count: master.master_reviews_count || 0,
      specializations: (master.profile_specializations || [])
        .map((ps: any) => ps.specialization)
        .filter(Boolean)
        .slice(0, 2), // Показываем только первые 2 специализации
    }))

    return NextResponse.json({ masters })
  } catch (error: any) {
    console.error('Error fetching recommended masters:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch masters' }, { status: 500 })
  }
}
