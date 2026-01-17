import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

// PUT - Обновить отзыв
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json()
    const { targetType, rating, comment, images } = body

    if (!targetType || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
    }

    const tableName = targetType === 'master' ? 'master_reviews' : 'product_reviews'

    // Проверяем, что отзыв принадлежит текущему пользователю
    const { data: existingReview, error: checkError } = await supabaseAdmin
      .from(tableName)
      .select('reviewer_id')
      .eq('id', params.id)
      .single()

    if (checkError || !existingReview) {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
    }

    if (existingReview.reviewer_id !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from(tableName)
      .update({
        rating,
        comment: comment?.trim() || null,
        images: images?.length > 0 ? images : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ review: data })
  } catch (error: any) {
    console.error('Error updating review:', error)
    return NextResponse.json({ error: error.message || 'Failed to update review' }, { status: 500 })
  }
}

// DELETE - Удалить отзыв
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const targetType = searchParams.get('type') || 'master'

    const tableName = targetType === 'master' ? 'master_reviews' : 'product_reviews'

    // Проверяем, что отзыв принадлежит текущему пользователю
    const { data: existingReview, error: checkError } = await supabaseAdmin
      .from(tableName)
      .select('reviewer_id')
      .eq('id', params.id)
      .single()

    if (checkError || !existingReview) {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
    }

    if (existingReview.reviewer_id !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting review:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete review' }, { status: 500 })
  }
}
