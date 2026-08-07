import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/app/api/admin/_shared'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// ID системного пользователя "Администрация VayMaster"
// Установите это значение в .env.local или используйте значение по умолчанию
const ADMIN_SYSTEM_USER_ID = process.env.ADMIN_SYSTEM_USER_ID || '970f2f4c-b3e2-4b7f-af7b-45a45e50356c'

// TODO(CURSOR_01 #11): массовая рассылка рискует таймаутом serverless-функции —
// вынести в фоновую очередь (промпт 3 / инфраструктура). Сейчас — CAP получателей.

export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin(request)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    const body = await request.json()
    const { message, type, role, user_ids } = body

    if (!message || !type) {
      return NextResponse.json({ error: 'message и type обязательны' }, { status: 400 })
    }

    console.log('Admin role verified for user:', gate.adminId)

    // Получаем список получателей (с лимитом во избежание getAll)
    const RECIPIENTS_CAP_ALL = 2000
    const RECIPIENTS_CAP_ROLE = 500
    let recipientIds: string[] = []

    const supabaseClient = createClient(supabaseUrl!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: request.headers.get('authorization') || '',
        },
      },
    })

    if (type === 'all') {
      const { data: batch } = await supabaseClient
        .from('profiles')
        .select('id')
        .range(0, RECIPIENTS_CAP_ALL - 1)
      recipientIds = (batch || []).map((u: any) => u.id)
    } else if (type === 'role') {
      const { data: roleUsers } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('role', role)
        .range(0, RECIPIENTS_CAP_ROLE - 1)
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

    // Используем supabaseAdmin для поиска системного пользователя и создания чатов (обход RLS)
    if (!supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY не настроен. Добавьте его в .env.local и перезапустите сервер.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Получаем или создаем системного пользователя
    let systemUserId = ADMIN_SYSTEM_USER_ID
    let systemUser = null

    // Сначала проверяем, существует ли пользователь с указанным ADMIN_SYSTEM_USER_ID
    if (systemUserId) {
      const { data: checkUser, error: checkError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', systemUserId)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking system user:', checkError)
      }

      if (checkUser) {
        systemUser = checkUser
        console.log('Using configured system user:', systemUserId)
      }
    }

    // Если системный пользователь не найден, используем первого активного администратора
    if (!systemUser) {
      console.log('System user not found, using first active admin instead')
      
      const { data: firstAdmin, error: adminError } = await supabaseAdmin
        .from('admin_roles')
        .select('user_id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (adminError) {
        console.error('Error finding admin:', adminError)
        return NextResponse.json({ 
          error: `Ошибка при поиске администратора: ${adminError.message}` 
        }, { status: 500 })
      }

      if (!firstAdmin) {
        console.error('No active admin found in admin_roles table')
        return NextResponse.json({ 
          error: 'Не найден активный администратор для отправки сообщений. Убедитесь, что в системе есть хотя бы один активный администратор в таблице admin_roles.' 
        }, { status: 400 })
      }

      // Проверяем, что администратор существует в profiles
      const { data: adminProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', firstAdmin.user_id)
        .single()

      if (profileError) {
        console.error('Error finding admin profile:', profileError)
        return NextResponse.json({ 
          error: `Ошибка при поиске профиля администратора: ${profileError.message}` 
        }, { status: 500 })
      }

      if (!adminProfile) {
        console.error('Admin profile not found for user:', firstAdmin.user_id)
        return NextResponse.json({ 
          error: 'Профиль администратора не найден. Убедитесь, что администратор имеет профиль в системе.' 
        }, { status: 400 })
      }

      systemUserId = firstAdmin.user_id
      systemUser = adminProfile
      console.log('Using first active admin as system user:', systemUserId, adminProfile.full_name || adminProfile.email)
    }

    // Отправляем сообщения
    let sentCount = 0
    const errors: string[] = []

    for (const recipientId of recipientIds) {
      try {
        // Проверяем, есть ли уже чат с системным пользователем (используем supabaseAdmin)
        const { data: existingChat } = await supabaseAdmin
          .from('chats')
          .select('id')
          .or(`and(user1_id.eq.${systemUserId},user2_id.eq.${recipientId}),and(user1_id.eq.${recipientId},user2_id.eq.${systemUserId})`)
          .maybeSingle()

        let chatId: string

        if (existingChat) {
          chatId = existingChat.id
        } else {
          // Создаем новый чат через supabaseAdmin (обход RLS)
          const { data: newChat, error: chatError } = await supabaseAdmin
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

        // Отправляем сообщение через supabaseAdmin (обход RLS)
        const { error: messageError } = await supabaseAdmin.from('messages').insert({
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

