import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tinkoffVerifyNotificationToken } from '@/lib/tinkoff'
import { extendProByDays } from '@/lib/proSubscription'
import { notifyUser } from '@/lib/notify'

const supabaseService = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export const dynamic = 'force-dynamic'

/** Webhook Tinkoff (уведомление об оплате) */
export async function POST(request: Request) {
  const password = process.env.TINKOFF_PASSWORD
  if (!password) {
    return NextResponse.json({ TerminalKey: '', Success: false, Message: 'No password' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ Success: false }, { status: 400 })
  }

  if (!tinkoffVerifyNotificationToken(body, password)) {
    console.warn('Tinkoff notification: bad token')
    return NextResponse.json({ Success: false, Message: 'Invalid token' }, { status: 403 })
  }

  const orderId = body.OrderId != null ? String(body.OrderId) : ''
  const success =
    body.Success === true ||
    String(body.Status || '').toUpperCase() === 'CONFIRMED' ||
    String(body.PaymentStatus || '').toUpperCase() === 'CONFIRMED'

  if (!orderId || !success) {
    return NextResponse.json({ Success: true })
  }

  const admin = supabaseService()

  const { data: session, error: sErr } = await admin
    .from('payment_sessions')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (sErr || !session) {
    console.warn('Tinkoff notification: session not found', orderId)
    return NextResponse.json({ Success: true })
  }

  if (session.status === 'paid') {
    return NextResponse.json({ Success: true })
  }

  const kind = (session as { kind?: string }).kind || 'order_publication'

  if (kind === 'pro_subscription') {
    const raw = session.payload as { days?: unknown }
    const days = typeof raw?.days === 'number' && raw.days > 0 ? Math.floor(raw.days) : 30
    let proUntil = ''
    try {
      const extended = await extendProByDays(admin, session.user_id, days)
      proUntil = extended.pro_until
    } catch (e) {
      console.error('Tinkoff notification: extend PRO', e)
      return NextResponse.json({ Success: false, Message: 'PRO update failed' }, { status: 500 })
    }
    await admin
      .from('payment_sessions')
      .update({
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    const untilLabel = proUntil
      ? new Date(proUntil).toLocaleDateString('ru-RU')
      : `${days} дн.`
    await notifyUser(admin, {
      userId: session.user_id,
      chatText: `PRO активирован ✅\n\nПодписка продлена на ${days} дн. (до ${untilLabel}).\nСпасибо за оплату!`,
      pushTitle: 'PRO активирован',
      pushBody: `Подписка действует до ${untilLabel}`,
      pushUrl: '/pro',
    })
    return NextResponse.json({ Success: true })
  }

  const payload = session.payload as {
    title?: string
    description?: string
    category?: string
    location?: { city?: string; address?: string }
    budget?: number | null
    imageUrls?: string[]
  }

  if (!payload?.title || !payload?.description || !payload?.category) {
    await admin
      .from('payment_sessions')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', orderId)
    return NextResponse.json({ Success: true })
  }

  const orderData: Record<string, unknown> = {
    client_id: session.user_id,
    title: payload.title.trim(),
    description: payload.description.trim(),
    category: payload.category.trim(),
    location: payload.location?.address?.trim() || '',
    status: 'open',
    images: Array.isArray(payload.imageUrls) ? payload.imageUrls : [],
  }
  if (payload.location?.city?.trim()) {
    orderData.city = payload.location.city.trim()
  }
  if (payload.budget != null && typeof payload.budget === 'number' && payload.budget > 0) {
    orderData.budget = payload.budget
  }

  const { data: newOrder, error: oErr } = await admin.from('orders').insert(orderData).select('id').single()

  if (oErr || !newOrder) {
    console.error('Tinkoff notification: order insert', oErr)
    return NextResponse.json({ Success: false, Message: String(oErr?.message || 'insert') }, { status: 500 })
  }

  await admin
    .from('payment_sessions')
    .update({
      status: 'paid',
      created_order_id: newOrder.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  const title = String(payload.title || 'Заказ')
  await notifyUser(admin, {
    userId: session.user_id,
    chatText: `Заказ опубликован ✅\n\n«${title}» уже видят мастера. Следите за откликами во вкладке «Отклики» в чатах.`,
    pushTitle: 'Заказ опубликован',
    pushBody: `«${title}» — ждите отклики мастеров`,
    pushUrl: `/orders/${newOrder.id}`,
  })

  return NextResponse.json({ Success: true })
}
