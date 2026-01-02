import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY не настроен')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      )
    }

    // Проверяем, что пользователь является участником чата
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('user1_id, user2_id')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Чат не найден' },
        { status: 404 }
      )
    }

    if (chat.user1_id !== user.id && chat.user2_id !== user.id) {
      return NextResponse.json(
        { error: 'Нет доступа к этому чату' },
        { status: 403 }
      )
    }

    // Удаляем все сообщения
    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('chat_id', chatId)

    if (messagesError) {
      console.error('Error deleting messages:', messagesError)
      return NextResponse.json(
        { error: 'Ошибка при удалении сообщений' },
        { status: 500 }
      )
    }

    // Удаляем чат
    const { error: deleteError } = await supabaseAdmin
      .from('chats')
      .delete()
      .eq('id', chatId)

    if (deleteError) {
      console.error('Error deleting chat:', deleteError)
      return NextResponse.json(
        { error: 'Ошибка при удалении чата' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Чат удален для всех участников' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in delete chat endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

