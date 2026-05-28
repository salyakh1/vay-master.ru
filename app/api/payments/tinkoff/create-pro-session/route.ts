import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getProPaymentSettings } from '@/lib/payment-settings-server'

const supabaseAnon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const supabaseService = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
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

    const role = (user.user_metadata?.role || 'client') as string
    if (role !== 'master' && role !== 'seller') {
      return NextResponse.json({ error: 'PRO доступен только мастерам и продавцам' }, { status: 403 })
    }

    const settings = await getProPaymentSettings()
    if (settings.proPaymentProvider !== 'tinkoff') {
      return NextResponse.json({ error: 'Выбранный банк/провайдер для PRO пока не реализован' }, { status: 400 })
    }
    if (!settings.paymentProPurchaseEnabled || !settings.paymentTinkoffEnabled || !settings.tinkoffEnvConfigured) {
      return NextResponse.json({ error: 'Покупка PRO через оплату отключена' }, { status: 400 })
    }

    const { data: profile } = await supabaseService()
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 })
    }

    const days = settings.proSubscriptionDays
    const amountKopecks = Math.round(settings.proSubscriptionPriceRub * 100)
    if (amountKopecks <= 0) {
      return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 })
    }

    const payload = { days }

    const admin = supabaseService()
    const { data: row, error: insError } = await admin
      .from('payment_sessions')
      .insert({
        user_id: user.id,
        kind: 'pro_subscription',
        payload,
        amount_kopecks: amountKopecks,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insError || !row) {
      console.error('payment_sessions insert', insError)
      return NextResponse.json(
        { error: 'Не удалось создать сессию оплаты. Проверьте таблицу payment_sessions.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessionId: row.id })
  } catch (e: any) {
    console.error('create-pro-session', e)
    return NextResponse.json({ error: e?.message || 'Ошибка' }, { status: 500 })
  }
}
