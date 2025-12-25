import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ID системного пользователя "Администрация VayMaster"
// Установите это значение в .env.local или используйте значение по умолчанию
const ADMIN_SYSTEM_USER_ID = process.env.ADMIN_SYSTEM_USER_ID || '65437d30-e3d4-40e2-8678-a8463030a43d'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, type, role, user_ids } = body

    if (!message || !type) {
      return NextResponse.json({ error: 'message и type обязательны' }, { status: 400 })
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

    // Проверяем, что пользователь - администратор
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем права администратора
    const { data: adminRole, error: adminRoleError } = await supabaseClient
      .from('admin_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role', ['super_admin', 'moderator'])
      .maybeSingle()

    if (adminRoleError) {
      console.error('Error checking admin role:', adminRoleError)
      return NextResponse.json({ 
        error: `Ошибка при проверке прав администратора: ${adminRoleError.message}` 
      }, { status: 500 })
    }

    if (!adminRole) {
      console.error('Admin role not found for user:', user.id, user.email)
      return NextResponse.json({ 
        error: 'Доступ запрещен. У вас нет прав администратора для выполнения этой операции.' 
      }, { status: 403 })
    }

    console.log('Admin role verified:', adminRole.role, 'for user:', user.id)

    // Получаем список получателей
    let recipientIds: string[] = []

    if (type === 'all') {
      // Все пользователи
      const { data: allUsers } = await supabaseClient.from('profiles').select('id')
      recipientIds = (allUsers || []).map((u: any) => u.id)
    } else if (type === 'role') {
      // По ролям
      const { data: roleUsers } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('role', role)
      recipientIds = (roleUsers || []).map((u: any) => u.id)
    } else if (type === 'individual' && user_ids && Array.isArray(user_ids)) {
      // Индивидуально
      recipientIds = user_ids
    } else {
      return NextResponse.json({ error: 'Неверный тип рассылки или список пользователей' }, { status: 400 })
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'Нет получателей для отправки' }, { status: 400 })
    }

    // Получаем или создаем системного пользователя
    let systemUserId = ADMIN_SYSTEM_USER_ID

    if (!systemUserId) {
      // Если не указан системный пользователь, используем первого активного администратора
      const { data: firstAdmin } = await supabaseClient
        .from('admin_roles')
        .select('user_id')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!firstAdmin) {
        return NextResponse.json({ error: 'Не найден активный администратор для отправки сообщений' }, { status: 400 })
      }

      systemUserId = firstAdmin.user_id
    }

    // Проверяем, что системный пользователь существует
    const { data: systemUser } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', systemUserId)
      .single()

    if (!systemUser) {
      return NextResponse.json(
        { error: 'Системный пользователь не найден. Создайте пользователя в auth.users и укажите его ID в ADMIN_SYSTEM_USER_ID' },
        { status: 400 }
      )
    }

    // Отправляем сообщения
    let sentCount = 0
    const errors: string[] = []

    for (const recipientId of recipientIds) {
      try {
        // Проверяем, есть ли уже чат с системным пользователем
        const { data: existingChat } = await supabaseClient
          .from('chats')
          .select('id')
          .or(`and(user1_id.eq.${systemUserId},user2_id.eq.${recipientId}),and(user1_id.eq.${recipientId},user2_id.eq.${systemUserId})`)
          .maybeSingle()

        let chatId: string

        if (existingChat) {
          chatId = existingChat.id
        } else {
          // Создаем новый чат
          const { data: newChat, error: chatError } = await supabaseClient
            .from('chats')
            .insert({
              user1_id: systemUserId,
              user2_id: recipientId,
            })
            .select()
            .single()

          if (chatError) {
            errors.push(`Ошибка создания чата для ${recipientId}: ${chatError.message}`)
            continue
          }

          chatId = newChat.id
        }

        // Отправляем сообщение
        const { error: messageError } = await supabaseClient.from('messages').insert({
          chat_id: chatId,
          sender_id: systemUserId,
          content: message,
          read: false,
        })

        if (messageError) {
          errors.push(`Ошибка отправки сообщения для ${recipientId}: ${messageError.message}`)
        } else {
          sentCount++
        }
      } catch (error: any) {
        errors.push(`Ошибка для ${recipientId}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent_count: sentCount,
      total: recipientIds.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Error in admin messages API:', error)
    return NextResponse.json(
      { error: `Внутренняя ошибка сервера: ${error.message}` },
      { status: 500 }
    )
  }
}

