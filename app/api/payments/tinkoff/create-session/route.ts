import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPaymentOrderSettings } from '@/lib/payment-settings-server'
import { validateOrderFields } from '@/lib/order-validation'

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

type SessionPayload = {
  title?: string
  description?: string
  category?: string
  location?: { city?: string; address?: string }
  budget?: number | null
  imageUrls?: string[]
}

function sameOrderDraft(a: SessionPayload, b: SessionPayload): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.category === b.category &&
    (a.location?.city || '') === (b.location?.city || '') &&
    (a.location?.address || '') === (b.location?.address || '') &&
    (a.budget ?? null) === (b.budget ?? null)
  )
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
    const validated = validateOrderFields(body)
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }
    if (!body.location?.city?.trim() || !body.location?.address?.trim()) {
      return NextResponse.json({ error: 'Укажите город и адрес' }, { status: 400 })
    }

    const amountKopecks = Math.round(settings.orderPublicationPriceRub * 100)
    if (amountKopecks <= 0) {
      return NextResponse.json({ error: 'Некорректная сумма' }, { status: 400 })
    }

    const payload = {
      title: validated.title,
      description: validated.description,
      category: validated.category,
      location: {
        city: body.location.city.trim(),
        address: body.location.address.trim(),
      },
      budget: body.budget ?? null,
      imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : [],
    }

    const admin = supabaseService()

    // Идемпотентность: переиспользуем свежую pending-сессию с тем же черновиком
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: pendingRows } = await admin
      .from('payment_sessions')
      .select('id, payload, created_at')
      .eq('user_id', user.id)
      .eq('kind', 'order_publication')
      .eq('status', 'pending')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10)

    const reuse = (pendingRows || []).find((row) =>
      sameOrderDraft((row.payload || {}) as SessionPayload, payload)
    )
    if (reuse) {
      return NextResponse.json({ sessionId: reuse.id })
    }

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
