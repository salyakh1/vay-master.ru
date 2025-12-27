import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chatId } = body

    if (!chatId) {
      return NextResponse.json({ error: 'chatId обязателен' }, { status: 400 })
    }

    // Получаем токен из заголовков
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // Проверяем, что пользователь авторизован
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем, что чат принадлежит пользователю
    const { data: chat, error: chatError } = await supabaseClient
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Чат не найден' }, { status: 404 })
    }

    if (chat.user1_id !== user.id && chat.user2_id !== user.id) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    // Используем service role key для обхода RLS при обновлении сообщений
    if (!supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY не настроен' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Помечаем все непрочитанные сообщения как прочитанные через admin client
    const { error: updateError, data: updatedMessages } = await supabaseAdmin
      .from('messages')
      .update({ read: true })
      .eq('chat_id', chatId)
      .eq('read', false)
      .neq('sender_id', user.id)
      .select('id')

    if (updateError) {
      console.error('Error marking messages as read:', updateError)
      return NextResponse.json(
        { error: `Ошибка при пометке сообщений: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updatedCount: updatedMessages?.length || 0,
    })
  } catch (error: any) {
    console.error('Error in mark-read API:', error)
    return NextResponse.json(
      { error: `Внутренняя ошибка сервера: ${error.message}` },
      { status: 500 }
    )
  }
}

