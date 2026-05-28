import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPaymentOrderSettings } from '@/lib/payment-settings-server'

const supabaseAnon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const supabaseService = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export const dynamic = 'force-dynamic'

export type OrderPublicationPayload = {
  title: string
  description: string
  category: string
  location: { city: string; address: string }
  budget?: number | null
  imageUrls: string[]
}

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

    const settings = await getPaymentOrderSettings()
    if (settings.orderPaymentProvider !== 'tinkoff') {
      return NextResponse.json({ error: 'Выбранный банк/провайдер для заказов пока не реализован' }, { status: 400 })
    }
    if (!settings.paymentTinkoffEnabled || !settings.tinkoffEnvConfigured) {
      return NextResponse.json({ error: 'Оплата Тинькофф отключена' }, { status: 400 })
    }

    const body = (await request.json()) as OrderPublicationPayload
    if (!body.title?.trim() || !body.description?.trim() || !body.category?.trim()) {
      return NextResponse.json({ error: 'Заполните обязательные поля заказа' }, { status: 400 })
    }
    if (!body.location?.city?.trim() || !body.location?.address?.trim()) {
      return NextResponse.json({ error: 'Укажите город и адрес' }, { status: 400 })
    }

    const amountKopecks = Math.round(settings.orderPublicationPriceRub * 100)
    if (amountKopecks <= 0) {
      return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 })
    }

    const payload = {
      title: body.title.trim(),
      description: body.description.trim(),
      category: body.category.trim(),
      location: {
        city: body.location.city.trim(),
        address: body.location.address.trim(),
      },
      budget: body.budget ?? null,
      imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : [],
    }

    const admin = supabaseService()
    const { data: row, error: insError } = await admin
      .from('payment_sessions')
      .insert({
        user_id: user.id,
        kind: 'order_publication',
        payload,
        amount_kopecks: amountKopecks,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insError || !row) {
      console.error('payment_sessions insert', insError)
      return NextResponse.json(
        { error: 'Не удалось создать сессию оплаты. Выполните SQL: supabase/payment_sessions.sql' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessionId: row.id })
  } catch (e: any) {
    console.error('create-session', e)
    return NextResponse.json({ error: e?.message || 'Ошибка' }, { status: 500 })
  }
}
