import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request: NextRequest) {
  const { success } = rateLimit(getClientIp(request), 10, 60_000)
  if (!success) return rateLimitResponse()

  try {
    const body = await request.json()
    const { reported_user_id, chat_id, comment } = body

    if (!reported_user_id || !comment) {
      return NextResponse.json(
        { error: 'reported_user_id и comment обязательны' },
        { status: 400 }
      )
    }

    // Получаем токен из заголовков
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Создаем клиент с токеном
    const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // Получаем пользователя
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Создаем жалобу
    const { data, error } = await supabaseClient
      .from('complaints')
      .insert({
        complainer_id: user.id,
        reported_user_id,
        chat_id: chat_id || null,
        comment: comment.trim(),
        status: 'new',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating complaint:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: `Ошибка при создании жалобы: ${error.message || JSON.stringify(error)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, complaint: data })
  } catch (error: any) {
    console.error('Error in complaints API:', error)
    return NextResponse.json(
      { error: `Внутренняя ошибка сервера: ${error.message || JSON.stringify(error)}` },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Получаем cookies для аутентификации
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value
    const refreshToken = cookieStore.get('sb-refresh-token')?.value

    let supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!)

    // Пробуем получить токен из заголовков, если нет в cookies
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      })
    } else if (accessToken) {
      supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      })

      if (refreshToken) {
        await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      }
    } else {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем, является ли пользователь администратором
    const { data: adminRole } = await supabaseClient
      .from('admin_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role', ['super_admin', 'moderator'])
      .single()

    if (!adminRole) {
      // Если не админ, возвращаем только свои жалобы
      const { data, error } = await supabaseClient
        .from('complaints')
        .select(`
          *,
          complainer:profiles!complaints_complainer_id_fkey(id, full_name, avatar_url),
          reported_user:profiles!complaints_reported_user_id_fkey(id, full_name, avatar_url),
          chat:chats(id)
        `)
        .eq('complainer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching complaints:', error)
        return NextResponse.json(
          { error: 'Ошибка при получении жалоб' },
          { status: 500 }
        )
      }

      return NextResponse.json({ complaints: data || [] })
    }

    // Если админ, возвращаем все жалобы
    const { data, error } = await supabaseClient
      .from('complaints')
      .select(`
        *,
        complainer:profiles!complaints_complainer_id_fkey(id, full_name, avatar_url),
        reported_user:profiles!complaints_reported_user_id_fkey(id, full_name, avatar_url),
        chat:chats(id)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching complaints:', error)
      return NextResponse.json(
        { error: 'Ошибка при получении жалоб' },
        { status: 500 }
      )
    }

    return NextResponse.json({ complaints: data || [] })
  } catch (error: any) {
    console.error('Error in complaints API:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

