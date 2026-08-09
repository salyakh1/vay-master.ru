import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin, requireAdmin } from '@/app/api/admin/_shared'

export const dynamic = 'force-dynamic'

function revalidateBannerPages() {
  revalidatePath('/')
  revalidatePath('/search')
  revalidatePath('/products')
  revalidatePath('/feed')
  revalidatePath('/api/banners')
}

/** Полный список баннеров из БД (service_role) — правда для админки */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('ad_banners')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: publicActive } = await admin
      .from('ad_banners')
      .select('id, title, pages, ad_type, is_active')
      .eq('is_active', true)

    const heroPublic = (publicActive || []).filter(
      (b) => !b.ad_type || b.ad_type === 'HERO_SPONSORED'
    )

    return NextResponse.json({
      banners: data || [],
      publicActiveHeroCount: heroPublic.length,
      publicActiveHero: heroPublic,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

/**
 * POST:
 * - { action: 'deactivate_all_active' }
 * - { action: 'create', banner: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const body = await request.json().catch(() => ({}))
    const admin = getSupabaseAdmin()

    if (body?.action === 'deactivate_all_active') {
      const { data, error } = await admin
        .from('ad_banners')
        .update({ is_active: false })
        .eq('is_active', true)
        .select('id')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      revalidateBannerPages()
      return NextResponse.json({ ok: true, deactivated: data?.length || 0 })
    }

    if (body?.action === 'create') {
      const b = body.banner || {}
      if (!b.image_url || !Array.isArray(b.pages) || b.pages.length === 0) {
        return NextResponse.json(
          { error: 'Нужны image_url и хотя бы одна страница' },
          { status: 400 }
        )
      }

      const row: Record<string, unknown> = {
        title: (b.title || 'Баннер').toString().trim() || 'Баннер',
        description: b.description ?? '',
        image_url: b.image_url,
        type: b.type || 'image',
        ad_type: b.ad_type || 'HERO_SPONSORED',
        target_type: b.target_type ?? null,
        target_id: b.target_id || null,
        external_url: b.external_url || null,
        pages: b.pages,
        priority: Number(b.priority) || 0,
        duration: Number(b.duration) || 5,
        is_active: b.is_active !== false,
        category: b.category || [],
        keywords: b.keywords || [],
        regions: b.regions?.length ? b.regions : ['ALL'],
        brand_name: b.brand_name ?? '',
        pricing_model: b.pricing_model || 'fixed',
        show_badge: b.show_badge !== false,
        badge_text: (b.badge_text || 'Реклама').toString().trim() || 'Реклама',
        // false не затирать: быстрый режим = картинка без наших текстов
        show_title: b.show_title === true,
        show_description: b.show_description === true,
        created_by: gate.adminId,
      }

      if (b.hero_layout === 'full_image' || b.hero_layout === 'split') {
        row.hero_layout = b.hero_layout
      }
      if (b.start_date) row.start_date = b.start_date
      if (b.end_date) row.end_date = b.end_date

      let { data, error } = await admin.from('ad_banners').insert(row).select('*').single()

      if (error && /hero_layout|show_title|show_description|column/i.test(error.message)) {
        delete row.hero_layout
        delete row.show_title
        delete row.show_description
        const retry = await admin.from('ad_banners').insert(row).select('*').single()
        data = retry.data
        error = retry.error
      }

      if (error) {
        console.error('admin banner create:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      revalidateBannerPages()
      return NextResponse.json({ ok: true, banner: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    console.error('POST /api/admin/banners:', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
