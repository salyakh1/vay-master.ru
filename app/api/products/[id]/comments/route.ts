import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

// Строит дерево: любой комментарий может иметь ответы (рекурсивно)
function buildCommentsTree(flat: any[]): any[] {
  const roots = flat.filter((c) => !c.parent_comment_id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  function attach(nodes: any[]): any[] {
    return nodes.map((n) => {
      const children = flat.filter((c) => c.parent_comment_id === n.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      return { ...n, replies: attach(children) }
    })
  }
  return attach(roots)
}

// GET - Получить комментарии к товару (полное дерево: каждый комментарий может иметь ответы)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10) || 0

    // Все комментарии товара (в т.ч. ответы на ответы)
    const { data: flat, error } = await supabase
      .from('product_comments')
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const tree = buildCommentsTree(flat || [])
    const roots = tree
    const paginated = offset >= 0 && limit > 0 ? roots.slice(offset, offset + limit) : roots

    return NextResponse.json({ comments: paginated, count: roots.length })
  } catch (error: any) {
    console.error('Error fetching product comments:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch comments' }, { status: 500 })
  }
}

// POST - Создать комментарий к товару
export async function POST(
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
    const { content, parentCommentId } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Комментарий не может быть пустым' }, { status: 400 })
    }

    const productId = params.id

    // Проверяем, что товар существует
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
    }

    // Если это ответ на комментарий, проверяем что родительский комментарий существует
    if (parentCommentId) {
      const { data: parentComment, error: parentError } = await supabaseAdmin
        .from('product_comments')
        .select('id, product_id')
        .eq('id', parentCommentId)
        .single()

      if (parentError || !parentComment || parentComment.product_id !== productId) {
        return NextResponse.json({ error: 'Родительский комментарий не найден' }, { status: 404 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('product_comments')
      .insert({
        product_id: productId,
        author_id: user.id,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
      })
      .select(`
        *,
        author:profiles!author_id(id, full_name, avatar_url, role)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ comment: data })
  } catch (error: any) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: error.message || 'Failed to create comment' }, { status: 500 })
  }
}
