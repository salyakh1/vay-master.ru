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

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, role } = body

    console.log('[welcome-message] Received request:', { userId, role })

    if (!userId || !role) {
      console.error('[welcome-message] Missing userId or role:', { userId, role })
      return NextResponse.json({ error: 'userId и role обязательны' }, { status: 400 })
    }

    if (!['client', 'master', 'seller'].includes(role)) {
      console.error('[welcome-message] Invalid role:', role)
      return NextResponse.json({ error: 'Неверная роль' }, { status: 400 })
    }

    if (!supabaseServiceRoleKey) {
      console.error('[welcome-message] SUPABASE_SERVICE_ROLE_KEY не настроен')
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY не настроен' },
        { status: 500 }
      )
    }

    console.log('[welcome-message] Using ADMIN_SYSTEM_USER_ID:', ADMIN_SYSTEM_USER_ID)

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Проверяем, что системный пользователь существует
    let systemUserId = ADMIN_SYSTEM_USER_ID
    let systemUser = null

    // Сначала проверяем, существует ли пользователь с указанным ADMIN_SYSTEM_USER_ID
    if (systemUserId) {
      const { data: checkUser, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', systemUserId)
        .maybeSingle()

      if (checkError) {
        console.error('[welcome-message] Error checking system user:', checkError)
      }

      if (checkUser) {
        systemUser = checkUser
        
        // Обновляем имя системного пользователя, если оно не соответствует требуемому формату
        if (systemUser.full_name !== 'VAY-MASTER · Администрация') {
          console.log('[welcome-message] Updating system user name to "VAY-MASTER · Администрация"')
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ full_name: 'VAY-MASTER · Администрация' })
            .eq('id', systemUserId)
          
          if (updateError) {
            console.error('[welcome-message] Error updating system user name:', updateError)
          } else {
            systemUser.full_name = 'VAY-MASTER · Администрация'
            console.log('[welcome-message] System user name updated successfully')
          }
        }
        
        console.log('[welcome-message] System user found:', systemUser.id, systemUser.full_name)
      }
    }

    // Если системный пользователь не найден, используем первого активного администратора
    if (!systemUser) {
      console.log('[welcome-message] System user not found, using first active admin instead')
      
      const { data: firstAdmin, error: adminError } = await supabaseAdmin
        .from('admin_roles')
        .select('user_id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (adminError) {
        console.error('[welcome-message] Error finding admin:', adminError)
      }

      if (!firstAdmin) {
        console.error('[welcome-message] No active admin found')
        return NextResponse.json(
          { error: 'Не найден активный администратор для отправки приветственного сообщения. Убедитесь, что в системе есть хотя бы один активный администратор.' },
          { status: 400 }
        )
      }

      // Проверяем, что администратор существует в profiles
      const { data: adminProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', firstAdmin.user_id)
        .single()

      if (profileError) {
        console.error('[welcome-message] Error finding admin profile:', profileError)
      }

      if (!adminProfile) {
        console.error('[welcome-message] Admin profile not found for user:', firstAdmin.user_id)
        return NextResponse.json(
          { error: 'Профиль администратора не найден. Убедитесь, что администратор имеет профиль в системе.' },
          { status: 400 }
        )
      }

      systemUserId = firstAdmin.user_id
      systemUser = adminProfile
      
      // Обновляем имя администратора, если оно не соответствует требуемому формату
      if (adminProfile.full_name !== 'VAY-MASTER · Администрация') {
        console.log('[welcome-message] Updating admin profile name to "VAY-MASTER · Администрация"')
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ full_name: 'VAY-MASTER · Администрация' })
          .eq('id', systemUserId)
        
        if (updateError) {
          console.error('[welcome-message] Error updating admin name:', updateError)
        } else {
          systemUser.full_name = 'VAY-MASTER · Администрация'
          console.log('[welcome-message] Admin name updated successfully')
        }
      }
      
      console.log('[welcome-message] Using first active admin as system user:', systemUserId, systemUser.full_name)
    }

    // Проверяем, есть ли уже чат с системным пользователем
    console.log('[welcome-message] Checking for existing chat between', systemUserId, 'and', userId)
    
    const { data: existingChat, error: chatCheckError } = await supabaseAdmin
      .from('chats')
      .select('id')
      .or(`and(user1_id.eq.${systemUserId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${systemUserId})`)
      .maybeSingle()

    if (chatCheckError) {
      console.error('[welcome-message] Error checking for existing chat:', chatCheckError)
    }

    let chatId: string

    if (existingChat) {
      console.log('[welcome-message] Existing chat found:', existingChat.id)
      
      // Если чат уже существует, проверяем, есть ли уже приветственное сообщение
      const { data: existingMessages, error: messagesCheckError } = await supabaseAdmin
        .from('messages')
        .select('id')
        .eq('chat_id', existingChat.id)
        .eq('sender_id', systemUserId)
        .limit(1)

      if (messagesCheckError) {
        console.error('[welcome-message] Error checking existing messages:', messagesCheckError)
      }

      // Если приветственное сообщение уже отправлено, не отправляем повторно
      if (existingMessages && existingMessages.length > 0) {
        console.log('[welcome-message] Welcome message already sent, skipping')
        return NextResponse.json({ 
          success: true, 
          message: 'Приветственное сообщение уже было отправлено ранее',
          skipped: true 
        })
      }

      chatId = existingChat.id
    } else {
      console.log('[welcome-message] No existing chat found, creating new chat')
      
      // Создаем новый чат через supabaseAdmin (обход RLS)
      const { data: newChat, error: chatError } = await supabaseAdmin
        .from('chats')
        .insert({
          user1_id: systemUserId,
          user2_id: userId,
        })
        .select()
        .single()

      if (chatError) {
        console.error('[welcome-message] Error creating chat:', chatError)
        return NextResponse.json(
          { error: `Ошибка создания чата: ${chatError.message}` },
          { status: 500 }
        )
      }

      if (!newChat) {
        console.error('[welcome-message] Chat creation returned no data')
        return NextResponse.json(
          { error: 'Ошибка создания чата: чат не был создан' },
          { status: 500 }
        )
      }

      console.log('[welcome-message] New chat created:', newChat.id)
      chatId = newChat.id
    }

    // Отправляем приветственное сообщение через supabaseAdmin (обход RLS)
    const welcomeMessage = welcomeMessages[role as keyof typeof welcomeMessages]
    
    console.log('[welcome-message] Sending message to chat:', chatId)
    
    const { data: insertedMessage, error: messageError } = await supabaseAdmin.from('messages').insert({
      chat_id: chatId,
      sender_id: systemUserId,
      content: welcomeMessage,
      read: false,
    }).select()

    if (messageError) {
      console.error('[welcome-message] Error sending welcome message:', messageError)
      return NextResponse.json(
        { error: `Ошибка отправки сообщения: ${messageError.message}` },
        { status: 500 }
      )
    }

    console.log('[welcome-message] Message sent successfully:', insertedMessage?.[0]?.id)
    return NextResponse.json({ success: true, message: 'Приветственное сообщение отправлено' })
  } catch (error: any) {
    console.error('Error in welcome-message API:', error)
    return NextResponse.json(
      { error: `Внутренняя ошибка сервера: ${error.message}` },
      { status: 500 }
    )
  }
}

