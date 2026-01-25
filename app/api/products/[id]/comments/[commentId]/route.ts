import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

// PUT - Обновить комментарий
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
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
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Комментарий не может быть пустым' }, { status: 400 })
    }

    // Проверяем, что комментарий принадлежит текущему пользователю
    const { data: existingComment, error: checkError } = await supabaseAdmin
      .from('product_comments')
      .select('author_id, product_id')
      .eq('id', params.commentId)
      .single()

    if (checkError || !existingComment) {
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 })
    }

    if (existingComment.author_id !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    if (existingComment.product_id !== params.id) {
      return NextResponse.json({ error: 'Неверный товар' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('product_comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.commentId)
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ comment: data })
  } catch (error: any) {
    console.error('Error updating comment:', error)
    return NextResponse.json({ error: error.message || 'Failed to update comment' }, { status: 500 })
  }
}

// DELETE - Удалить комментарий
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
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

    // Проверяем, что комментарий принадлежит текущему пользователю
    const { data: existingComment, error: checkError } = await supabaseAdmin
      .from('product_comments')
      .select('author_id, product_id')
      .eq('id', params.commentId)
      .single()

    if (checkError || !existingComment) {
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 })
    }

    if (existingComment.author_id !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    if (existingComment.product_id !== params.id) {
      return NextResponse.json({ error: 'Неверный товар' }, { status: 400 })
    }

    // Удаляем комментарий (каскадно удалятся ответы благодаря ON DELETE CASCADE)
    const { error } = await supabaseAdmin
      .from('product_comments')
      .delete()
      .eq('id', params.commentId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete comment' }, { status: 500 })
  }
}
