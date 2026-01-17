import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

// GET - Получить отзывы (о мастере или товаре)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const targetType = searchParams.get('type') // 'master' или 'product'
    const targetId = searchParams.get('targetId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'type and targetId are required' }, { status: 400 })
    }

    if (targetType === 'master') {
      const { data, error } = await supabase
        .from('master_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id(id, full_name, avatar_url, role),
          master:profiles!master_id(id, full_name)
        `)
        .eq('master_id', targetId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Получаем ответы на отзывы
      const reviewIds = data?.map(r => r.id) || []
      const { data: replies } = await supabase
        .from('review_replies')
        .select(`
          *,
          author:profiles!author_id(id, full_name, avatar_url)
        `)
        .eq('review_type', 'master')
        .in('review_id', reviewIds)
        .order('created_at', { ascending: true })

      // Группируем ответы по review_id
      const repliesMap = new Map<string, any[]>()
      replies?.forEach(reply => {
        if (!repliesMap.has(reply.review_id)) {
          repliesMap.set(reply.review_id, [])
        }
        repliesMap.get(reply.review_id)!.push(reply)
      })

      // Добавляем ответы к отзывам
      const reviewsWithReplies = data?.map(review => ({
        ...review,
        replies: repliesMap.get(review.id) || []
      })) || []

      return NextResponse.json({ reviews: reviewsWithReplies, count: reviewsWithReplies.length })
    } else if (targetType === 'product') {
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id(id, full_name, avatar_url, role),
          seller:profiles!seller_id(id, full_name),
          product:products!product_id(id, name)
        `)
        .eq('product_id', targetId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Получаем ответы на отзывы
      const reviewIds = data?.map(r => r.id) || []
      const { data: replies } = await supabase
        .from('review_replies')
        .select(`
          *,
          author:profiles!author_id(id, full_name, avatar_url)
        `)
        .eq('review_type', 'product')
        .in('review_id', reviewIds)
        .order('created_at', { ascending: true })

      // Группируем ответы по review_id
      const repliesMap = new Map<string, any[]>()
      replies?.forEach(reply => {
        if (!repliesMap.has(reply.review_id)) {
          repliesMap.set(reply.review_id, [])
        }
        repliesMap.get(reply.review_id)!.push(reply)
      })

      // Добавляем ответы к отзывам
      const reviewsWithReplies = data?.map(review => ({
        ...review,
        replies: repliesMap.get(review.id) || []
      })) || []

      return NextResponse.json({ reviews: reviewsWithReplies, count: reviewsWithReplies.length })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error: any) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch reviews' }, { status: 500 })
  }
}

// POST - Создать отзыв
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
    const { targetType, targetId, rating, comment, images, sellerId } = body

    if (!targetType || !targetId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
    }

    if (targetType === 'master') {
      // Проверяем, что не оставляем отзыв самому себе
      if (targetId === user.id) {
        return NextResponse.json({ error: 'Нельзя оставить отзыв самому себе' }, { status: 400 })
      }

      const { data, error } = await supabaseAdmin
        .from('master_reviews')
        .insert({
          master_id: targetId,
          reviewer_id: user.id,
          rating,
          comment: comment?.trim() || null,
          images: images?.length > 0 ? images : null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Вы уже оставили отзыв. Можно отредактировать существующий.' }, { status: 400 })
        }
        throw error
      }

      return NextResponse.json({ review: data })
    } else if (targetType === 'product') {
      if (!sellerId) {
        return NextResponse.json({ error: 'sellerId required for product reviews' }, { status: 400 })
      }

      // Проверяем, что не оставляем отзыв на свой товар
      if (sellerId === user.id) {
        return NextResponse.json({ error: 'Нельзя оставить отзыв на свой товар' }, { status: 400 })
      }

      const { data, error } = await supabaseAdmin
        .from('product_reviews')
        .insert({
          product_id: targetId,
          seller_id: sellerId,
          reviewer_id: user.id,
          rating,
          comment: comment?.trim() || null,
          images: images?.length > 0 ? images : null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'Вы уже оставили отзыв. Можно отредактировать существующий.' }, { status: 400 })
        }
        throw error
      }

      return NextResponse.json({ review: data })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error: any) {
    console.error('Error creating review:', error)
    return NextResponse.json({ error: error.message || 'Failed to create review' }, { status: 500 })
  }
}
