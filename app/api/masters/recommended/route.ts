import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

// Маппинг материалов к подкатегориям (по имени подкатегории)
const materialToSubcategories: Record<string, string[]> = {
  primer: ['Штукатурка и шпаклёвка'],
  putty: ['Штукатурка и шпаклёвка'],
  lime_mortar: ['Штукатурка и шпаклёвка'],
  wallpaper: ['Штукатурка и шпаклёвка'],
  paint: ['Штукатурка и шпаклёвка'],
  decorative_plaster: ['Штукатурка и шпаклёвка'],
  tile: ['Плитка и камень'],
  panels: ['Штукатурка и шпаклёвка'],
  drywall: ['Штукатурка и шпаклёвка'],
  concrete: ['Фундаментные работы'],
  screed: ['Фундаментные работы'],
  liquid_floor: ['Фундаментные работы'],
  laminate: ['Плитка и камень'],
  parquet: ['Плитка и камень'],
  tile_floor: ['Плитка и камень'],
  linoleum: ['Плитка и камень'],
  carpet: ['Плитка и камень'],
  self_leveling: ['Фундаментные работы'],
  wood: ['Плитка и камень'],
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('material_id')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!materialId) {
      return NextResponse.json({ error: 'material_id is required' }, { status: 400 })
    }

    const subcategoryNames = materialToSubcategories[materialId] || []
    if (subcategoryNames.length === 0) {
      return NextResponse.json({ masters: [] })
    }

    const { data: subcategoriesData, error: subError } = await supabaseAdmin
      .from('subcategories')
      .select('id, name')
      .in('name', subcategoryNames)

    if (subError || !subcategoriesData?.length) {
      return NextResponse.json({ masters: [] })
    }

    const subcategoryIds = subcategoriesData.map((s) => s.id)

    const { data: profileSubs, error: profileSubsError } = await supabaseAdmin
      .from('profile_subcategories')
      .select('profile_id')
      .in('subcategory_id', subcategoryIds)

    if (profileSubsError || !profileSubs?.length) {
      return NextResponse.json({ masters: [] })
    }

    const profileIds = Array.from(new Set(profileSubs.map((ps: { profile_id: string }) => ps.profile_id)))

    const { data: mastersData, error: mastersError } = await supabaseAdmin
      .from('profiles')
      .select(
        `
        id,
        full_name,
        avatar_url,
        city,
        description,
        master_rating,
        master_reviews_count,
        profile_subcategories (
          subcategory:subcategories (id, name, slug, category:categories (id, name, slug))
        )
      `
      )
      .eq('role', 'master')
      .in('id', profileIds)
      .order('master_rating', { ascending: false })
      .limit(limit)

    if (mastersError) {
      return NextResponse.json({ masters: [] })
    }

    const masters = (mastersData || []).map((master: any) => ({
      id: master.id,
      full_name: master.full_name,
      avatar_url: master.avatar_url,
      city: master.city,
      description: master.description,
      rating: master.master_rating || 0,
      reviews_count: master.master_reviews_count || 0,
      specializations: (master.profile_subcategories || [])
        .map((ps: any) => ps.subcategory?.category || ps.subcategory)
        .filter(Boolean)
        .slice(0, 2),
    }))

    return NextResponse.json({ masters })
  } catch (error: any) {
    console.error('Error fetching recommended masters:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch masters' }, { status: 500 })
  }
}
