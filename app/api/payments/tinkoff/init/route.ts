import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tinkoffInit } from '@/lib/tinkoff'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'

const supabaseAnon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const supabaseService = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { success } = rateLimit(`tinkoff-init:${getClientIp(request)}`, 20, 60_000)
  if (!success) return rateLimitResponse()

  try {
    const authHeader = request.headers.get('authorization')
    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!jwt) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAnon().auth.getUser(jwt)
    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const terminalKey = process.env.TINKOFF_TERMINAL_KEY
    const password = process.env.TINKOFF_PASSWORD
    if (!terminalKey || !password) {
      return NextResponse.json({ error: 'Терминал Тинькофф не настроен на сервере' }, { status: 500 })
    }

    const { sessionId } = (await request.json()) as { sessionId?: string }
    if (!sessionId) {
      return NextResponse.json({ error: 'Нет sessionId' }, { status: 400 })
    }

    const admin = supabaseService()
    const { data: session, error: sesError } = await admin
      .from('payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (sesError || !session) {
      return NextResponse.json({ error: 'Сессия не найдена' }, { status: 404 })
    }
    if (session.status !== 'pending') {
      return NextResponse.json({ error: 'Сессия уже обработана' }, { status: 400 })
    }

    const site =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const baseUrl = site.startsWith('http') ? site : `https://${site}`
    const kind = (session as { kind?: string }).kind || 'order_publication'
    const isPro = kind === 'pro_subscription'
    const successUrl = isPro
      ? `${baseUrl}/pro/payment-success?sessionId=${sessionId}`
      : `${baseUrl}/orders/new/payment-success?sessionId=${sessionId}`
    const failUrl = isPro ? `${baseUrl}/pro?payment=fail` : `${baseUrl}/orders/new?payment=fail`

    const result = await tinkoffInit({
      terminalKey,
      password,
      amountKopecks: session.amount_kopecks,
      orderId: sessionId,
      description: isPro ? 'PRO подписка VAY-MASTER' : 'Публикация заказа VAY-MASTER',
      successUrl,
      failUrl,
      notificationUrl: `${baseUrl}/api/payments/tinkoff/notification`,
      // СБП часто включается в личном кабинете Тинькофф; флаг payment_sbp_enabled в админке — для будущего DATA
    })

    if (!result.success || !result.paymentURL) {
      return NextResponse.json(
        { error: result.error || 'Не удалось создать платёж' },
        { status: 502 }
      )
    }

    if (result.paymentId) {
      await admin
        .from('payment_sessions')
        .update({ tinkoff_payment_id: result.paymentId, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
    }

    return NextResponse.json({ paymentUrl: result.paymentURL })
  } catch (e: any) {
    console.error('tinkoff init', e)
    return NextResponse.json({ error: e?.message || 'Ошибка' }, { status: 500 })
  }
}
