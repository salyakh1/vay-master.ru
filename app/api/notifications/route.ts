import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 20

// GET /api/notifications - получить уведомления пользователя (limit + cursor)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value ||
                  request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || DEFAULT_LIMIT), MAX_LIMIT)
    const cursor = searchParams.get('cursor') || ''

    let query = supabaseClient
      .from('notifications')
      .select('*, order:orders(id, title, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: notifications, error } = await query

    if (error) throw error

    const list = notifications || []
    const hasMore = list.length > limit
    const items = hasMore ? list.slice(0, limit) : list
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]?.created_at : null

    return NextResponse.json({
      notifications: items,
      nextCursor: nextCursor ?? null,
      hasMore: !!hasMore,
    })
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: error.message || 'Ошибка при получении уведомлений' }, { status: 500 })
  }
}

// PATCH /api/notifications - отметить уведомления как прочитанные
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      // Отметить все уведомления пользователя как прочитанные
      const { error } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    if (notificationId) {
      // Отметить одно уведомление как прочитанное
      const { error } = await supabaseClient
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Не указан notificationId или markAllAsRead' }, { status: 400 })
  } catch (error: any) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: error.message || 'Ошибка при обновлении уведомлений' }, { status: 500 })
  }
}
