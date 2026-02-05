import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * @deprecated Таблица specializations удалена. Используйте PATCH /api/admin/master-categories/[id]/image для категорий и /api/admin/subcategories/[id]/image для подкатегорий.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    {
      error: 'Специализации заменены на категории и подкатегории. Используйте разделы «Категории мастеров» и «Подкатегории» в админке «Картинки».',
    },
    { status: 410 }
  )
}
