import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY не настроен — удаление подписок через API будет недоступно')
}

const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

export const dynamic = 'force-dynamic'

/** Удаление подписки или подписчика (обходит RLS). */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Сервис временно недоступен' },
        { status: 503 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { targetUserId, action } = body as { targetUserId?: string; action?: 'unfollow' | 'remove_follower' }

    if (!targetUserId || !action || !['unfollow', 'remove_follower'].includes(action)) {
      return NextResponse.json(
        { error: 'Нужны targetUserId и action: unfollow | remove_follower' },
        { status: 400 }
      )
    }

    if (action === 'unfollow') {
      const { error } = await supabaseAdmin
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
      if (error) {
        console.error('follows remove unfollow:', error)
        return NextResponse.json({ error: 'Не удалось отписаться' }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'remove_follower') {
      const { error } = await supabaseAdmin
        .from('follows')
        .delete()
        .eq('follower_id', targetUserId)
        .eq('following_id', user.id)
      if (error) {
        console.error('follows remove follower:', error)
        return NextResponse.json({ error: 'Не удалось убрать подписчика' }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Неверный action' }, { status: 400 })
  } catch (e) {
    console.error('follows/remove:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Внутренняя ошибка' },
      { status: 500 }
    )
  }
}
