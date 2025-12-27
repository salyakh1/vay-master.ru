import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

// ID системного пользователя "Администрация VayMaster"
const ADMIN_SYSTEM_USER_ID = process.env.ADMIN_SYSTEM_USER_ID || '970f2f4c-b3e2-4b7f-af7b-45a45e50356c'

// Тексты приветственных сообщений
const welcomeMessages = {
  client: `Добро пожаловать в VAY-MASTER 👋

Вы зарегистрировались как клиент.

Здесь вы можете:
• находить проверенных мастеров
• заказывать услуги и материалы
• общаться напрямую без посредников

🔹 Советы:
• подробно описывайте задачу
• прикладывайте фото — это ускоряет отклики
• все договорённости фиксируйте в чате

Если у вас возникнут вопросы или проблемы — напишите в этот чат.
Администрация всегда на связи.`,

  master: `Добро пожаловать в VAY-MASTER 👋

Вы зарегистрировались как мастер.

Важно:
• честно указывайте услуги и опыт
• публикуйте только свои работы
• соблюдайте корректное общение с клиентами

❗ Нарушения, жалобы и попытки обмана фиксируются системой.
Повторные нарушения приводят к ограничениям аккаунта.

Рекомендуем:
• заполнить профиль
• добавить портфолио
• указать реальные цены

Если нужны разъяснения — этот чат прямой канал связи с администрацией.`,

  seller: `Добро пожаловать в VAY-MASTER 👋

Вы зарегистрировались как продавец.

Обратите внимание:
• товары должны соответствовать описанию
• актуальные цены и наличие обязательны
• запрещена продажа контрафакта

❗ За ложную информацию и жалобы покупателей аккаунт может быть ограничен.

Рекомендуем:
• добавить фото товаров
• указать условия доставки
• заполнить информацию о магазине

По любым вопросам вы можете писать в этот чат напрямую администрации.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId и role обязательны' }, { status: 400 })
    }

    if (!['client', 'master', 'seller'].includes(role)) {
      return NextResponse.json({ error: 'Неверная роль' }, { status: 400 })
    }

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

    // Проверяем, что системный пользователь существует
    const { data: systemUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', ADMIN_SYSTEM_USER_ID)
      .single()

    if (!systemUser) {
      return NextResponse.json(
        { error: 'Системный пользователь не найден' },
        { status: 400 }
      )
    }

    // Проверяем, есть ли уже чат с системным пользователем
    const { data: existingChat } = await supabaseAdmin
      .from('chats')
      .select('id')
      .or(`and(user1_id.eq.${ADMIN_SYSTEM_USER_ID},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${ADMIN_SYSTEM_USER_ID})`)
      .maybeSingle()

    let chatId: string

    if (existingChat) {
      // Если чат уже существует, проверяем, есть ли уже приветственное сообщение
      const { data: existingMessages } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('chat_id', existingChat.id)
        .eq('sender_id', ADMIN_SYSTEM_USER_ID)
        .limit(1)

      // Если приветственное сообщение уже отправлено, не отправляем повторно
      if (existingMessages && existingMessages.length > 0) {
        return NextResponse.json({ 
          success: true, 
          message: 'Приветственное сообщение уже было отправлено ранее',
          skipped: true 
        })
      }

      chatId = existingChat.id
    } else {
      // Создаем новый чат через supabaseAdmin (обход RLS)
      const { data: newChat, error: chatError } = await supabaseAdmin
        .from('chats')
        .insert({
          user1_id: ADMIN_SYSTEM_USER_ID,
          user2_id: userId,
        })
        .select()
        .single()

      if (chatError) {
        console.error('Error creating chat:', chatError)
        return NextResponse.json(
          { error: `Ошибка создания чата: ${chatError.message}` },
          { status: 500 }
        )
      }

      chatId = newChat.id
    }

    // Отправляем приветственное сообщение через supabaseAdmin (обход RLS)
    const welcomeMessage = welcomeMessages[role as keyof typeof welcomeMessages]
    
    const { error: messageError } = await supabaseAdmin.from('messages').insert({
      chat_id: chatId,
      sender_id: ADMIN_SYSTEM_USER_ID,
      content: welcomeMessage,
      read: false,
    })

    if (messageError) {
      console.error('Error sending welcome message:', messageError)
      return NextResponse.json(
        { error: `Ошибка отправки сообщения: ${messageError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Приветственное сообщение отправлено' })
  } catch (error: any) {
    console.error('Error in welcome-message API:', error)
    return NextResponse.json(
      { error: `Внутренняя ошибка сервера: ${error.message}` },
      { status: 500 }
    )
  }
}

