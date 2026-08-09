import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin, requireAdmin } from '@/app/api/admin/_shared'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

/** Жёсткое удаление баннера через service_role + сброс кэша страниц */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const gate = await requireAdmin(request)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.from('ad_banners').delete().eq('id', id).select('id')

    if (error) {
      console.error('admin banner delete:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data?.length) {
      return NextResponse.json(
        { error: 'Баннер не найден или уже удалён' },
        { status: 404 }
      )
    }

    // Сбрасываем SSR/кэш страниц, где баннеры вшиваются в HTML
    revalidatePath('/')
    revalidatePath('/search')
    revalidatePath('/products')
    revalidatePath('/feed')
    revalidatePath('/api/banners')

    return NextResponse.json({ ok: true, deletedId: id })
  } catch (e: any) {
    console.error('DELETE /api/admin/banners/[id]:', e)
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}
