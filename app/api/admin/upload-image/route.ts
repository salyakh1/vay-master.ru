import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, requireAdmin } from '../_shared'

export const dynamic = 'force-dynamic'

const BUCKET = 'admin-images'
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
// type: category = product_categories; master_category = categories (мастера); subcategory = subcategories; specialization = legacy

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'category'

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Файл не более 2 МБ' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Формат: JPG, PNG, WebP или GIF' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeExt = ['jpeg', 'jpg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
    const path =
      type === 'specialization'
        ? `specializations/${crypto.randomUUID()}.${safeExt}`
        : type === 'master_category'
          ? `master_categories/${crypto.randomUUID()}.${safeExt}`
          : type === 'subcategory'
            ? `subcategories/${crypto.randomUUID()}.${safeExt}`
            : `categories/${crypto.randomUUID()}.${safeExt}`

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.storage.from(BUCKET).upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: true,
    })

    if (error) {
      console.error('upload-image:', error)
      return NextResponse.json(
        { error: error.message || 'Ошибка загрузки. Создайте bucket "admin-images" в Supabase Storage (публичный).' },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (e: any) {
    console.error('POST upload-image:', e)
    return NextResponse.json({ error: e?.message || 'Ошибка сервера' }, { status: 500 })
  }
}
