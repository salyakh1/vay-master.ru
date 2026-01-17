import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

async function getBoolSetting(key: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  return data?.value === true
}

// GET - Получить истории
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') // Для конкретного пользователя
    const page = searchParams.get('page') // 'search', 'products', 'feed'
    const currentUserId = searchParams.get('currentUserId') // ID текущего пользователя для проверки просмотров

    const now = new Date().toISOString()

    let query = supabase
      .from('stories')
      .select(`
        *,
        user:profiles!user_id(id, full_name, avatar_url, role)
      `)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })

    // Фильтр по пользователю
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Фильтр по странице
    if (page === 'search') {
      // Только мастера - получаем ID мастеров и фильтруем
      const { data: masters, error: mastersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'master')
      
      if (mastersError) {
        console.error('Error fetching masters:', mastersError)
        return NextResponse.json({ stories: [] })
      }
      
      if (masters && masters.length > 0) {
        const masterIds = masters.map(m => m.id)
        query = query.in('user_id', masterIds)
      } else {
        console.log('No masters found')
        return NextResponse.json({ stories: [] })
      }
    } else if (page === 'products') {
      // Только продавцы - получаем ID продавцов и фильтруем
      const { data: sellers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'seller')
      
      if (sellers && sellers.length > 0) {
        const sellerIds = sellers.map(s => s.id)
        query = query.in('user_id', sellerIds)
      } else {
        return NextResponse.json({ stories: [] })
      }
    } else if (page === 'feed') {
      // Только те, на кого подписан текущий пользователь
      if (currentUserId) {
        // Получаем список подписок
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)

        if (follows && follows.length > 0) {
          const followingIds = follows.map(f => f.following_id)
          query = query.in('user_id', followingIds)
        } else {
          // Если нет подписок, возвращаем пустой массив
          return NextResponse.json({ stories: [] })
        }
      } else {
        return NextResponse.json({ stories: [] })
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching stories:', error)
      throw error
    }
    
    console.log(`Found ${data?.length || 0} stories for page: ${page}`)

    // Проверяем просмотры для текущего пользователя
    if (currentUserId && data && data.length > 0) {
      const storyIds = data.map(s => s.id)
      const { data: views } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', currentUserId)
        .in('story_id', storyIds)

      const viewedStoryIds = new Set(views?.map(v => v.story_id) || [])

      // Добавляем флаг viewed_by_user
      const storiesWithViews = data.map((story: any) => ({
        ...story,
        viewed_by_user: viewedStoryIds.has(story.id)
      }))

      return NextResponse.json({ stories: storiesWithViews })
    }

    return NextResponse.json({ stories: data || [] })
  } catch (error) {
    console.error('Error fetching stories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Создать историю
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, media, mediaType, description } = body

    if (!userId || !media || !mediaType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Ограничение PRO: после пробной недели мастера/продавцы не могут публиковать истории без PRO
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      const role = (profile as any)?.role
      if (role === 'master' || role === 'seller') {
        const [disableMasters, disableSellers] = await Promise.all([
          getBoolSetting('pro_disable_master_restrictions'),
          getBoolSetting('pro_disable_seller_restrictions'),
        ])
        const restrictionsDisabled =
          (role === 'master' && disableMasters) || (role === 'seller' && disableSellers)

        if (restrictionsDisabled) {
          // Глобально отключены ограничения — разрешаем
          // (не выходим; просто не применяем блокировку ниже)
        } else {
        const trialStartRaw = (profile as any)?.pro_trial_started_at || (profile as any)?.created_at
        const trialStart = trialStartRaw ? new Date(trialStartRaw) : new Date()
        const base = Number.isNaN(trialStart.getTime()) ? new Date() : trialStart
        const trialEnds = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000)
        const proUntil = (profile as any)?.pro_until ? new Date((profile as any).pro_until) : null
        const isPro = (profile as any)?.is_pro === true || (proUntil && proUntil.getTime() > Date.now())
        const isTrial = Date.now() < trialEnds.getTime()

        if (!isPro && !isTrial) {
          return NextResponse.json(
            { error: 'Истории доступны только в PRO после пробной недели', code: 'PRO_REQUIRED_STORIES' },
            { status: 403 }
          )
        }
        }
      }
    } catch (e) {
      // если профиль не загрузился — не блокируем, чтобы не ломать поток (логика продублирована на клиенте)
      console.warn('Stories PRO check failed:', e)
    }

    // Валидация: максимум 4 фото или 1 видео
    if (mediaType === 'photos' && media.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 photos allowed' }, { status: 400 })
    }
    if (mediaType === 'video' && media.length > 1) {
      return NextResponse.json({ error: 'Only 1 video allowed' }, { status: 400 })
    }

    // Создаем историю
    const { data, error } = await supabaseAdmin
      .from('stories')
      .insert({
        user_id: userId,
        media: media,
        media_type: mediaType,
        description: description || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 часа
      })
      .select(`
        *,
        user:profiles!user_id(id, full_name, avatar_url, role)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ story: data })
  } catch (error: any) {
    console.error('Error creating story:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
