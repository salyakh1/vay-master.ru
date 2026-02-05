import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, requireAdmin } from '../../../_shared'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/subcategories/[id]/image
 * Установка image_url для подкатегории (таблица subcategories).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const id = params.id
    if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const image_url = typeof body.image_url === 'string' ? body.image_url.trim() || null : null

    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('subcategories')
      .update({ image_url })
      .eq('id', id)
      .select('id, name, slug, image_url')
      .single()

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Подкатегория не найдена' }, { status: 404 })
      throw error
    }

    return NextResponse.json(data)
  } catch (e: any) {
    console.error('PATCH subcategory image:', e)
    return NextResponse.json({ error: e?.message || 'Ошибка сервера' }, { status: 500 })
  }
}
