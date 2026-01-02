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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const responseId = params.id
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

    // Получаем отклик с информацией о заказе
    const { data: response, error: responseError } = await supabaseAdmin
      .from('order_responses')
      .select(`
        *,
        order:orders!inner(id, client_id, status, selected_master_id)
      `)
      .eq('id', responseId)
      .single()

    if (responseError || !response) {
      return NextResponse.json(
        { error: 'Отклик не найден' },
        { status: 404 }
      )
    }

    const order = (response as any).order

    // Проверяем, что пользователь - владелец заказа
    if (order.client_id !== user.id) {
      return NextResponse.json(
        { error: 'Только владелец заказа может принимать отклики' },
        { status: 403 }
      )
    }

    // Проверяем, что заказ еще открыт
    if (order.status !== 'open' && order.status !== 'new') {
      return NextResponse.json(
        { error: 'Заказ уже не принимает отклики' },
        { status: 403 }
      )
    }

    // Проверяем, что отклик еще pending
    if (response.status !== 'pending') {
      return NextResponse.json(
        { error: `Отклик уже обработан (статус: ${response.status})` },
        { status: 409 }
      )
    }

    // Проверяем, что заказ еще не имеет выбранного мастера
    if (order.selected_master_id) {
      return NextResponse.json(
        { error: 'Исполнитель уже выбран для этого заказа' },
        { status: 409 }
      )
    }

    // ТРАНЗАКЦИЯ: Принимаем отклик и обновляем заказ
    // Используем транзакцию через функцию PostgreSQL для атомарности
    const { data: result, error: transactionError } = await supabaseAdmin.rpc(
      'accept_order_response',
      {
        p_response_id: responseId,
        p_order_id: order.id,
        p_master_id: response.master_id
      }
    )

    if (transactionError) {
      console.error('Transaction error:', transactionError)
      return NextResponse.json(
        { error: 'Ошибка при принятии отклика' },
        { status: 500 }
      )
    }

    // Отправляем уведомление мастеру
    try {
      await sendNotificationToMaster(
        response.master_id,
        order.id,
        user.id
      )
    } catch (notifError) {
      console.error('Error sending notification:', notifError)
    }

    return NextResponse.json(
      { 
        message: 'Отклик принят',
        data: { orderId: order.id, masterId: response.master_id }
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in accept endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

async function sendNotificationToMaster(
  masterId: string,
  orderId: string,
  clientId: string
) {
  // Получаем данные клиента
  const { data: client } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .eq('id', clientId)
    .single()

  if (!client) return

  // Проверяем или создаем чат между клиентом и мастером
  let { data: chat } = await supabaseAdmin
    .from('chats')
    .select('id')
    .or(`and(user1_id.eq.${masterId},user2_id.eq.${clientId}),and(user1_id.eq.${clientId},user2_id.eq.${masterId})`)
    .maybeSingle()

  if (!chat) {
    const { data: newChat } = await supabaseAdmin
      .from('chats')
      .insert({
        user1_id: masterId,
        user2_id: clientId
      })
      .select()
      .single()
    
    if (newChat) {
      chat = newChat
    } else {
      return
    }
  }

  // Проверяем, что chat точно не null
  if (!chat) {
    return
  }

  // Отправляем сообщение от клиента мастеру
  const message = `Ваш отклик на заказ принят!\n\nКлиент ${client.full_name || 'Клиент'} выбрал вас в качестве исполнителя.\n\nПерейти к заказу: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://vay-master.ru'}/orders/${orderId}`

  await supabaseAdmin
    .from('messages')
    .insert({
      chat_id: chat.id,
      sender_id: clientId,
      content: message,
      read: false
    })
}

