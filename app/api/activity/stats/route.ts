import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    // Получаем профиль пользователя для проверки роли
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 })
    }

    const userId = user.id
    const role = profile.role || null

    // Время последнего просмотра по типам (для счётчика «новых»)
    const { data: seenRows } = await supabaseAdmin
      .from('activity_seen')
      .select('activity_type, seen_at')
      .eq('user_id', userId)
    const seenMap = new Map<string, string>()
    seenRows?.forEach((r: { activity_type: string; seen_at: string }) => { seenMap.set(r.activity_type, r.seen_at) })
    const after = (t: string) => seenMap.get(t) || '1970-01-01T00:00:00.000Z'

    const stats: any = {
      comments: 0, comments_new: 0,
      likes: 0, likes_new: 0,
      responses: 0, responses_new: 0,
      reviews: 0, reviews_new: 0,
      followers: 0, followers_new: 0,
      replies: 0, replies_new: 0,
    }

    // 1. Комментарии
    if (role === 'master') {
      const { data: portfolioItems } = await supabaseAdmin
        .from('portfolio_items')
        .select('id')
        .eq('master_id', userId)
      if (portfolioItems && portfolioItems.length > 0) {
        const portfolioItemIds = portfolioItems.map((item: { id: string }) => item.id)
        const { count } = await supabaseAdmin
          .from('portfolio_comments')
          .select('id', { count: 'exact', head: true })
          .in('portfolio_item_id', portfolioItemIds)
        stats.comments = count || 0
        const { count: countNew } = await supabaseAdmin
          .from('portfolio_comments')
          .select('id', { count: 'exact', head: true })
          .in('portfolio_item_id', portfolioItemIds)
          .gt('created_at', after('comments'))
        stats.comments_new = countNew || 0
      }
    } else if (role === 'seller') {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('seller_id', userId)
      if (products && products.length > 0) {
        const productIds = products.map((p: { id: string }) => p.id)
        const { count } = await supabaseAdmin
          .from('product_comments')
          .select('id', { count: 'exact', head: true })
          .in('product_id', productIds)
        stats.comments = count || 0
        const { count: countNew } = await supabaseAdmin
          .from('product_comments')
          .select('id', { count: 'exact', head: true })
          .in('product_id', productIds)
          .gt('created_at', after('comments'))
        stats.comments_new = countNew || 0
      }
    }

    // 2. Лайки
    if (role === 'master') {
      const { data: portfolioItems } = await supabaseAdmin
        .from('portfolio_items')
        .select('id')
        .eq('master_id', userId)
      if (portfolioItems && portfolioItems.length > 0) {
        const portfolioItemIds = portfolioItems.map((item: { id: string }) => item.id)
        const { count } = await supabaseAdmin
          .from('portfolio_likes')
          .select('id', { count: 'exact', head: true })
          .in('portfolio_item_id', portfolioItemIds)
        stats.likes = count || 0
        const { count: countNew } = await supabaseAdmin
          .from('portfolio_likes')
          .select('id', { count: 'exact', head: true })
          .in('portfolio_item_id', portfolioItemIds)
          .gt('created_at', after('likes'))
        stats.likes_new = countNew || 0
      }
    }

    // 3. Отклики (только для мастеров)
    if (role === 'master') {
      const { count } = await supabaseAdmin
        .from('order_responses')
        .select('id', { count: 'exact', head: true })
        .eq('master_id', userId)
      stats.responses = count || 0
      const { count: countNew } = await supabaseAdmin
        .from('order_responses')
        .select('id', { count: 'exact', head: true })
        .eq('master_id', userId)
        .gt('created_at', after('responses'))
      stats.responses_new = countNew || 0
    }

    // 4. Отзывы
    if (role === 'master') {
      const { count } = await supabaseAdmin
        .from('master_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('master_id', userId)
      stats.reviews = count || 0
      const { count: countNew } = await supabaseAdmin
        .from('master_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('master_id', userId)
        .gt('created_at', after('reviews'))
      stats.reviews_new = countNew || 0
    } else if (role === 'seller') {
      const { count: c1 } = await supabaseAdmin
        .from('seller_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', userId)
      const { count: c2 } = await supabaseAdmin
        .from('product_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', userId)
      stats.reviews = (c1 || 0) + (c2 || 0)
      const { count: n1 } = await supabaseAdmin
        .from('seller_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .gt('created_at', after('reviews'))
      const { count: n2 } = await supabaseAdmin
        .from('product_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .gt('created_at', after('reviews'))
      stats.reviews_new = (n1 || 0) + (n2 || 0)
    }

    // 5. Подписки (followers)
    const { count } = await supabaseAdmin
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId)
    stats.followers = count || 0
    const { count: countNew } = await supabaseAdmin
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId)
      .gt('created_at', after('followers'))
    stats.followers_new = countNew || 0

    // 6. Ответы на комментарии (replies) — для всех пользователей
    // Рекурсивно находим все ответы (включая вложенные)
    const { data: myComments, error: myCommentsError } = await supabaseAdmin
      .from('product_comments')
      .select('id')
      .eq('author_id', userId)
    
    if (myCommentsError) {
      console.error('[activity/stats] Error fetching user comments:', myCommentsError)
    }
    
    const myIds = myComments?.map((c: { id: string }) => c.id) || []
    console.log(`[activity/stats] replies: found ${myIds.length} user comments for userId=${userId}`)
    
    if (myIds.length > 0) {
      // Итеративно находим все уровни ответов
      const allReplyIds = new Set<string>()
      let currentLevel = [...myIds]
      
      for (let level = 0; level < 10 && currentLevel.length > 0; level++) {
        const { data: levelReplies, error: levelError } = await supabaseAdmin
          .from('product_comments')
          .select('id')
          .in('parent_comment_id', currentLevel)
        
        if (levelError) {
          console.error(`[activity/stats] Error fetching replies at level ${level}:`, levelError)
          break
        }
        
        const newLevel = (levelReplies || []).map((r: any) => r.id).filter((id: string) => !allReplyIds.has(id))
        newLevel.forEach((id: string) => allReplyIds.add(id))
        console.log(`[activity/stats] replies: level ${level} found ${newLevel.length} replies (total so far: ${allReplyIds.size})`)
        currentLevel = newLevel
        if (newLevel.length === 0) break
      }
      
      console.log(`[activity/stats] replies: total ${allReplyIds.size} unique replies found (including nested)`)
      
      // Подсчитываем все ответы
      if (allReplyIds.size > 0) {
        const { count: rc, error: countError } = await supabaseAdmin
          .from('product_comments')
          .select('id', { count: 'exact', head: true })
          .in('id', Array.from(allReplyIds))
        
        if (countError) {
          console.error('[activity/stats] Error counting replies:', countError)
          stats.replies = 0
        } else {
          stats.replies = rc || 0
        }
        
        // Подсчитываем новые ответы
        const { count: rcNew, error: countNewError } = await supabaseAdmin
          .from('product_comments')
          .select('id', { count: 'exact', head: true })
          .in('id', Array.from(allReplyIds))
          .gt('created_at', after('replies'))
        
        if (countNewError) {
          console.error('[activity/stats] Error counting new replies:', countNewError)
          stats.replies_new = 0
        } else {
          stats.replies_new = rcNew || 0
        }
        
        console.log(`[activity/stats] replies: final count=${stats.replies}, new=${stats.replies_new}`)
      } else {
        console.log('[activity/stats] replies: no replies found')
        stats.replies = 0
        stats.replies_new = 0
      }
    } else {
      console.log('[activity/stats] replies: user has no comments')
      stats.replies = 0
      stats.replies_new = 0
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Error fetching activity stats:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch stats' }, { status: 500 })
  }
}
