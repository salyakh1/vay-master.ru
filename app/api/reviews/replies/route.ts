import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

// POST - Создать ответ на отзыв
export async function POST(request: NextRequest) {
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
    const { reviewId, reviewType, content } = body

    if (!reviewId || !reviewType || !content?.trim()) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
    }

    if (reviewType !== 'master' && reviewType !== 'product') {
      return NextResponse.json({ error: 'Invalid reviewType' }, { status: 400 })
    }

    // Проверяем, что отзыв существует
    const tableName = reviewType === 'master' ? 'master_reviews' : 'product_reviews'
    const { data: review, error: reviewError } = await supabaseAdmin
      .from(tableName)
      .select('master_id, reviewer_id, seller_id')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Отзыв не найден' }, { status: 404 })
    }

    // Проверяем, что пользователь может ответить (автор отзыва или владелец)
    const canReply = 
      review.reviewer_id === user.id || // Автор отзыва может ответить
      (reviewType === 'master' && review.master_id === user.id) || // Мастер может ответить на свой отзыв
      (reviewType === 'product' && review.seller_id === user.id) // Продавец может ответить на отзыв о товаре

    if (!canReply) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('review_replies')
      .insert({
        review_id: reviewId,
        review_type: reviewType,
        author_id: user.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ reply: data })
  } catch (error: any) {
    console.error('Error creating reply:', error)
    return NextResponse.json({ error: error.message || 'Failed to create reply' }, { status: 500 })
  }
}
