import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tinkoffVerifyNotificationToken } from '@/lib/tinkoff'
import { extendProByDays } from '@/lib/proSubscription'
import { notifyUser } from '@/lib/notify'
import { validateOrderFields } from '@/lib/order-validation'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const supabaseService = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export const dynamic = 'force-dynamic'

/** Атомарный claim: только один webhook-воркер проходит дальше. */
async function claimPaymentSession(admin: ReturnType<typeof supabaseService>, orderId: string) {
  const { data, error } = await admin
    .from('payment_sessions')
    .update({
      status: 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()

  if (error) {
    console.error('Tinkoff notification: claim failed', error)
    return { claimed: false as const, session: null, reason: 'error' as const }
  }
  if (data) {
    return { claimed: true as const, session: data, reason: 'claimed' as const }
  }

  const { data: current } = await admin
    .from('payment_sessions')
    .select('id, status, created_order_id')
    .eq('id', orderId)
    .maybeSingle()

  if (current?.status === 'paid' || current?.status === 'processing') {
    return { claimed: false as const, session: null, reason: 'already_handled' as const }
  }

  return { claimed: false as const, session: null, reason: 'unavailable' as const }
}

/** Webhook Tinkoff (уведомление об оплате) */
export async function POST(request: Request) {
  const limited = rateLimit(`tinkoff-notify:${getClientIp(request)}`, 120, 60_000)
  if (!limited.success) return rateLimitResponse()

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
  const claim = await claimPaymentSession(admin, orderId)

  if (!claim.claimed) {
    // Повторная доставка / параллельный webhook — не создаём дубликат
    return NextResponse.json({ Success: true })
  }

  const session = claim.session
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
      await admin
        .from('payment_sessions')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('status', 'processing')
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

  const validated = validateOrderFields(payload)
  if (!validated.ok) {
    await admin
      .from('payment_sessions')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', orderId)
    return NextResponse.json({ Success: true })
  }

  const orderData: Record<string, unknown> = {
    client_id: session.user_id,
    title: validated.title,
    description: validated.description,
    category: validated.category,
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
    // Откат claim — Tinkoff сможет ретраить
    await admin
      .from('payment_sessions')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'processing')
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

  const title = validated.title
  await notifyUser(admin, {
    userId: session.user_id,
    chatText: `Заказ опубликован ✅\n\n«${title}» уже видят мастера. Следите за откликами во вкладке «Отклики» в чатах.`,
    pushTitle: 'Заказ опубликован',
    pushBody: `«${title}» — ждите отклики мастеров`,
    pushUrl: `/orders/${newOrder.id}`,
  })

  return NextResponse.json({ Success: true })
}
