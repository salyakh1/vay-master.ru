import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, requireAdmin } from '@/app/api/admin/_shared'

export const dynamic = 'force-dynamic'

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

    // Что реально отдаётся публичному API (активные hero)
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

/** Массово выключить все активные баннеры (если «удалённые» всё ещё светятся у пользователей) */
export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const body = await request.json().catch(() => ({}))
    if (body?.action !== 'deactivate_all_active') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('ad_banners')
      .update({ is_active: false })
      .eq('is_active', true)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/')
    revalidatePath('/search')
    revalidatePath('/products')
    revalidatePath('/feed')

    return NextResponse.json({ ok: true, deactivated: data?.length || 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
