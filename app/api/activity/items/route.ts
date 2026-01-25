import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

const TYPES = ['comments', 'likes', 'responses', 'reviews', 'followers', 'replies'] as const
const PERIODS = ['all', '1d', '7d', '30d'] as const
const PERIOD_DAYS: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30 }

function formatDate (d: string) {
  try {
    const dt = new Date(d)
    const now = new Date()
    const diff = (now.getTime() - dt.getTime()) / 1000
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} мин. назад`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`
    if (diff < 604800) return `${Math.floor(diff / 86400)} дн. назад`
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: dt.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  } catch { return '' }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role || null

    const type = request.nextUrl.searchParams.get('type') as typeof TYPES[number] | null
    if (!type || !TYPES.includes(type)) return NextResponse.json({ error: 'Недопустимый type' }, { status: 400 })
    if (type === 'responses' && role !== 'master') return NextResponse.json({ error: 'Отклики только для мастеров' }, { status: 403 })
    if (type !== 'replies' && role !== 'master' && role !== 'seller') return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })

    const period = (request.nextUrl.searchParams.get('period') as typeof PERIODS[number]) || 'all'
    const days = period !== 'all' && PERIODS.includes(period) ? PERIOD_DAYS[period] : null
    const after = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null

    const userId = user.id
    console.log(`[activity/items] type=${type}, period=${period}, after=${after}, userId=${userId}, role=${role}`)

    let items: { id: string; title: string; subtitle: string; link: string; created_at: string; targetLabel?: string; replyLink?: string }[] = []

    if (type === 'comments') {
      if (role === 'master') {
        const { data: portfolioItems } = await supabaseAdmin.from('portfolio_items').select('id, title').eq('master_id', userId)
        const itemMap = new Map((portfolioItems || []).map((i: { id: string; title?: string }) => [i.id, i]))
        const ids = portfolioItems?.map((i: { id: string }) => i.id) || []
        if (ids.length) {
          let query = supabaseAdmin
            .from('portfolio_comments')
            .select(`
              id, content, created_at, portfolio_item_id,
              author:profiles!user_id(id, full_name)
            `)
            .in('portfolio_item_id', ids)
          if (after) query = query.gt('created_at', after)
          const { data: rows } = await query.order('created_at', { ascending: false }).limit(50)
          items = (rows || []).map((r: any) => {
            const tit = (itemMap.get(r.portfolio_item_id) as any)?.title || 'Работа'
            return {
              id: r.id,
              title: `Комментарий от ${r.author?.full_name || 'Пользователь'}`,
              subtitle: (r.content || '').slice(0, 80) + ((r.content || '').length > 80 ? '…' : ''),
              targetLabel: `К работе «${tit}»`,
              link: `/profile/${userId}?openPortfolio=${r.portfolio_item_id}&comment=${r.id}`,
              replyLink: `/profile/${userId}?openPortfolio=${r.portfolio_item_id}&focusComment=1`,
              created_at: r.created_at,
            }
          })
        }
      } else {
        const { data: products } = await supabaseAdmin.from('products').select('id, title').eq('seller_id', userId)
        const productMap = new Map((products || []).map((p: { id: string; title: string }) => [p.id, p.title]))
        const productIds = products?.map((p: { id: string }) => p.id) || []
        if (productIds.length) {
          let query = supabaseAdmin
            .from('product_comments')
            .select(`
              id, content, created_at, product_id,
              author:profiles!author_id(id, full_name)
            `)
            .in('product_id', productIds)
          if (after) query = query.gt('created_at', after)
          const { data: rows } = await query.order('created_at', { ascending: false }).limit(50)
          items = (rows || []).map((r: any) => {
            const pTitle = productMap.get(r.product_id) || 'Товар'
            return {
              id: r.id,
              title: `Комментарий от ${r.author?.full_name || 'Пользователь'}`,
              subtitle: (r.content || '').slice(0, 80) + ((r.content || '').length > 80 ? '…' : ''),
              targetLabel: `К товару «${pTitle}»`,
              link: `/products/${r.product_id}#comment-${r.id}`,
              replyLink: `/products/${r.product_id}?replyTo=${r.id}`,
              created_at: r.created_at,
            }
          })
        }
      }
    } else if (type === 'likes' && role === 'master') {
      const { data: portfolioItems } = await supabaseAdmin.from('portfolio_items').select('id').eq('master_id', userId)
      const ids = portfolioItems?.map((i: { id: string }) => i.id) || []
      if (ids.length) {
        let query = supabaseAdmin
          .from('portfolio_likes')
          .select(`id, created_at, user_id, author:profiles!user_id(id, full_name)`)
          .in('portfolio_item_id', ids)
        if (after) query = query.gt('created_at', after)
        const { data: rows } = await query.order('created_at', { ascending: false }).limit(50)
        items = (rows || []).map((r: any) => ({
          id: r.id,
          title: `${r.author?.full_name || 'Пользователь'} лайкнул работу`,
          subtitle: formatDate(r.created_at),
          link: `/profile/${userId}#portfolio`,
          created_at: r.created_at,
        }))
      }
    } else if (type === 'responses' && role === 'master') {
      let query = supabaseAdmin
        .from('order_responses')
        .select(`
          id, created_at, order_id, message,
          order:orders(id, title)
        `)
        .eq('master_id', userId)
      if (after) query = query.gt('created_at', after)
      const { data: rows } = await query.order('created_at', { ascending: false }).limit(50)
      items = (rows || []).map((r: any) => ({
        id: r.id,
        title: `Отклик на заказ «${(r.order as any)?.title || 'Заказ'}»`,
        subtitle: (r.message || '').slice(0, 80) + ((r.message || '').length > 80 ? '…' : ''),
        link: `/orders/${r.order_id}`,
        created_at: r.created_at,
      }))
    } else if (type === 'reviews') {
      if (role === 'master') {
        let query = supabaseAdmin
          .from('master_reviews')
          .select(`id, rating, comment, created_at, reviewer:profiles!reviewer_id(id, full_name)`)
          .eq('master_id', userId)
        if (after) query = query.gt('created_at', after)
        const { data: rows, error } = await query.order('created_at', { ascending: false }).limit(50)
        if (error) console.error('Error fetching master_reviews:', error)
        console.log(`[activity/items] master_reviews: found ${rows?.length || 0} rows`)
        items = (rows || []).map((r: any) => ({
          id: r.id,
          title: `Отзыв от ${r.reviewer?.full_name || 'Пользователь'}, ${r.rating} ★`,
          subtitle: (r.comment || '').slice(0, 80) + ((r.comment || '').length > 80 ? '…' : ''),
          link: `/profile/${userId}#reviews`,
          created_at: r.created_at,
        }))
      } else if (role === 'seller') {
        const [seller, product] = await Promise.all([
          (async () => {
            let q = supabaseAdmin.from('seller_reviews').select(`id, rating, comment, created_at, reviewer:profiles!reviewer_id(id, full_name)`).eq('seller_id', userId)
            if (after) q = q.gt('created_at', after)
            const result = await q.order('created_at', { ascending: false }).limit(25)
            if (result.error) console.error('Error fetching seller_reviews:', result.error)
            console.log(`[activity/items] seller_reviews: found ${result.data?.length || 0} rows, error=${result.error?.message || 'none'}`)
            return result
          })(),
          (async () => {
            let q = supabaseAdmin.from('product_reviews').select(`id, rating, comment, created_at, product_id, product:products(id, title), reviewer:profiles!reviewer_id(id, full_name)`).eq('seller_id', userId)
            if (after) q = q.gt('created_at', after)
            const result = await q.order('created_at', { ascending: false }).limit(25)
            if (result.error) console.error('Error fetching product_reviews:', result.error)
            console.log(`[activity/items] product_reviews: found ${result.data?.length || 0} rows, error=${result.error?.message || 'none'}`)
            return result
          })(),
        ])
        const list: { id: string; title: string; subtitle: string; link: string; created_at: string }[] = []
        ;(seller.data || []).forEach((r: any) => list.push({
          id: r.id,
          title: `Отзыв от ${r.reviewer?.full_name || 'Пользователь'}, ${r.rating} ★`,
          subtitle: (r.comment || '').slice(0, 80) + ((r.comment || '').length > 80 ? '…' : ''),
          link: `/profile/${userId}#reviews`,
          created_at: r.created_at,
        }))
        ;(product.data || []).forEach((r: any) => list.push({
          id: r.id,
          title: `Отзыв к товару «${(r.product as any)?.title || 'Товар'}» от ${r.reviewer?.full_name || 'Пользователь'}, ${r.rating} ★`,
          subtitle: (r.comment || '').slice(0, 80) + ((r.comment || '').length > 80 ? '…' : ''),
          link: `/products/${r.product_id}`,
          created_at: r.created_at,
        }))
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        items = list.slice(0, 50)
      }
    } else if (type === 'followers') {
      let query = supabaseAdmin
        .from('follows')
        .select(`id, created_at, follower_id, follower:profiles!follower_id(id, full_name)`)
        .eq('following_id', userId)
      if (after) query = query.gt('created_at', after)
      const { data: rows } = await query.order('created_at', { ascending: false }).limit(50)
      items = (rows || []).map((r: any) => ({
        id: r.id,
        title: `${(r.follower as any)?.full_name || 'Пользователь'} подписался`,
        subtitle: formatDate(r.created_at),
        link: `/profile/${r.follower_id || (r.follower as any)?.id || ''}`,
        created_at: r.created_at,
      }))
    } else if (type === 'replies') {
      // Находим все комментарии пользователя
      const { data: myComments } = await supabaseAdmin
        .from('product_comments')
        .select('id')
        .eq('author_id', userId)
      const myIds = myComments?.map((c: { id: string }) => c.id) || []
      console.log(`[activity/items] replies: found ${myIds.length} user comments`)
      
      if (myIds.length > 0) {
        // Рекурсивно находим все ответы на комментарии пользователя (включая вложенные)
        // Итеративно находим все уровни ответов (максимум 10 уровней для безопасности)
        const allReplyIds = new Set<string>()
        let currentLevel = [...myIds]
        
        for (let level = 0; level < 10 && currentLevel.length > 0; level++) {
          // НЕ применяем фильтр по дате при поиске ответов - найдем все, потом отфильтруем
          const { data: levelReplies, error: levelError } = await supabaseAdmin
            .from('product_comments')
            .select('id, parent_comment_id')
            .in('parent_comment_id', currentLevel)
          
          if (levelError) {
            console.error(`Error fetching replies at level ${level}:`, levelError)
            break
          }
          
          const newLevel = (levelReplies || []).map((r: any) => r.id).filter((id: string) => !allReplyIds.has(id))
          newLevel.forEach((id: string) => allReplyIds.add(id))
          console.log(`[activity/items] replies: level ${level} found ${newLevel.length} replies`)
          currentLevel = newLevel
          if (newLevel.length === 0) break
        }
        
        console.log(`[activity/items] replies: total ${allReplyIds.size} unique replies found (including nested)`)
        
        // Теперь получаем полные данные всех найденных ответов
        if (allReplyIds.size > 0) {
          let query = supabaseAdmin
            .from('product_comments')
            .select(`
              id, content, created_at, product_id,
              author:profiles!author_id(id, full_name),
              product:products(id, title)
            `)
            .in('id', Array.from(allReplyIds))
          // Применяем фильтр по дате только при получении полных данных
          if (after) query = query.gt('created_at', after)
          const { data: rows, error: fetchError } = await query.order('created_at', { ascending: false }).limit(50)
          
          console.log(`[activity/items] replies: fetched ${rows?.length || 0} replies after date filter`)
          
          if (fetchError) {
            console.error('Error fetching full reply data:', fetchError)
            items = []
          } else {
            items = (rows || []).map((r: any) => {
              const pTitle = (r.product as any)?.title || 'Товар'
              return {
                id: r.id,
                title: `Ответ от ${r.author?.full_name || 'Пользователь'} на ваш комментарий`,
                subtitle: (r.content || '').slice(0, 80) + ((r.content || '').length > 80 ? '…' : ''),
                targetLabel: `К товару «${pTitle}»`,
                link: `/products/${r.product_id}#comment-${r.id}`,
                replyLink: `/products/${r.product_id}?replyTo=${r.id}`,
                created_at: r.created_at,
              }
            })
          }
        }
      }
    }

    console.log(`[activity/items] returning ${items.length} items for type=${type}`)
    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('activity/items', e)
    return NextResponse.json({ error: e?.message || 'Ошибка' }, { status: 500 })
  }
}
