import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyUser, sendPushToUser } from '@/lib/notify'
import { findOrCreateDirectChat, sendDirectChatMessage } from '@/lib/directChat'

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

async function getBoolSetting(key: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  return data?.value === true
}

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
      .select('*')
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

    // Ограничение тарифа: после пробной недели без PRO можно откликаться 1 раз в 3 дня
    // Trial старт:
    // - для существующих аккаунтов может быть проставлен pro_trial_started_at (с момента включения системы)
    // - для новых аккаунтов fallback на created_at (момент регистрации)
    const trialStartRaw = (profile as any)?.pro_trial_started_at || (profile as any)?.created_at
    const trialStart = trialStartRaw ? new Date(trialStartRaw) : new Date()
    const base = Number.isNaN(trialStart.getTime()) ? new Date() : trialStart
    const trialEnds = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000)
    const proUntil = (profile as any)?.pro_until ? new Date((profile as any).pro_until) : null
    const isPro = (profile as any)?.is_pro === true || (proUntil && proUntil.getTime() > Date.now())
    const isTrial = Date.now() < trialEnds.getTime()

    const disableMasters = await getBoolSetting('pro_disable_master_restrictions')

    if (!disableMasters && !isPro && !isTrial) {
      // Берём самый последний отклик мастера по любому заказу
      const { data: lastResp } = await supabaseAdmin
        .from('order_responses')
        .select('created_at')
        .eq('master_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastResp?.created_at) {
        const last = new Date(lastResp.created_at as any)
        const nextAllowed = new Date(last.getTime() + 3 * 24 * 60 * 60 * 1000)
        const remainingMs = nextAllowed.getTime() - Date.now()
        if (remainingMs > 0) {
          const remainingSeconds = Math.ceil(remainingMs / 1000)
          return NextResponse.json(
            {
              error: 'Ограничение тарифа: отклик доступен 1 раз в 3 дня. Оформите PRO, чтобы снять лимит.',
              code: 'RESPOND_COOLDOWN',
              remainingSeconds,
              nextAllowedAt: nextAllowed.toISOString(),
            },
            { status: 429 }
          )
        }
      }
    }

    // Проверяем заказ
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, client_id, status, title')
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

    // Чат клиент ↔ мастер: сообщение от мастера + push клиенту
    if (order.client_id) {
      const masterId = user.id
      const clientId = order.client_id as string
      const orderTitle = order.title || 'заказ'
      const masterName = profile.full_name || 'Мастер'
      const pricePart =
        price != null && String(price).trim() !== ''
          ? `\n\nМоё предложение: ${parseFloat(price)} ₽`
          : ''

      try {
        const chatId = await findOrCreateDirectChat(supabaseAdmin, masterId, clientId)
        if (chatId) {
          const chatText = `Здравствуйте! Я откликнулся на ваш заказ «${orderTitle}».${pricePart}\n\n${message.trim()}`
          await sendDirectChatMessage(supabaseAdmin, chatId, masterId, chatText)

          await sendPushToUser(supabaseAdmin, clientId, {
            title: 'Новый отклик на заказ',
            body: `${masterName}: отклик на «${orderTitle}»`,
            url: `/chats/${chatId}`,
          })
        } else {
          await notifyUser(supabaseAdmin, {
            userId: clientId,
            chatText: `Новый отклик на заказ «${orderTitle}»\n\n${masterName} откликнулся.${pricePart}\n\nСмотрите «Чаты → Отклики».`,
            pushTitle: 'Новый отклик на заказ',
            pushBody: `${masterName} откликнулся на «${orderTitle}»`,
            pushUrl: '/chats',
          })
        }
      } catch (e) {
        console.error('notify client on response', e)
      }
    }

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

