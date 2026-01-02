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
    const orderId = params.id
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

    const { price, message } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Сообщение обязательно' },
        { status: 400 }
      )
    }

    // Проверяем профиль пользователя
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Профиль не найден' },
        { status: 404 }
      )
    }

    if (profile.role !== 'master') {
      return NextResponse.json(
        { error: 'Только мастера могут откликаться на заказы' },
        { status: 403 }
      )
    }

    // Проверяем заказ
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, client_id, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      )
    }

    // Нельзя откликаться на свой заказ
    if (order.client_id === user.id) {
      return NextResponse.json(
        { error: 'Нельзя откликнуться на свой заказ' },
        { status: 403 }
      )
    }

    // Проверяем статус заказа
    if (order.status !== 'open' && order.status !== 'new') {
      return NextResponse.json(
        { error: `Заказ уже не принимает отклики (статус: ${order.status})` },
        { status: 403 }
      )
    }

    // Проверяем, не откликался ли уже мастер
    const { data: existingResponse } = await supabaseAdmin
      .from('order_responses')
      .select('id')
      .eq('order_id', orderId)
      .eq('master_id', user.id)
      .single()

    if (existingResponse) {
      return NextResponse.json(
        { error: 'Вы уже откликнулись на этот заказ' },
        { status: 409 }
      )
    }

    // Проверяем количество откликов (максимум 30)
    const { count } = await supabaseAdmin
      .from('order_responses')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)

    if (count && count >= 30) {
      return NextResponse.json(
        { error: 'Превышен лимит откликов на заказ (максимум 30)' },
        { status: 403 }
      )
    }

    // Создаем отклик
    const { data: response, error: responseError } = await supabaseAdmin
      .from('order_responses')
      .insert({
        order_id: orderId,
        master_id: user.id,
        price: price ? parseFloat(price) : null,
        message: message.trim(),
        status: 'pending'
      })
      .select()
      .single()

    if (responseError) {
      console.error('Error creating response:', responseError)
      return NextResponse.json(
        { error: 'Ошибка при создании отклика' },
        { status: 500 }
      )
    }

    // Отклики отображаются во вкладке "Отклики", не отправляем сообщение в чат
    // Уведомление будет видно только во вкладке "Отклики" на странице /chats

    return NextResponse.json({ data: response }, { status: 201 })
  } catch (error: any) {
    console.error('Error in respond endpoint:', error)
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// Функция удалена - отклики больше не отправляются в чаты
// Они отображаются только во вкладке "Отклики" на странице /chats

