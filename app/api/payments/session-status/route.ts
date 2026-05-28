import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAnon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const supabaseService = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: 'Нет sessionId' }, { status: 400 })
    }

    const { data: session, error } = await supabaseService()
      .from('payment_sessions')
      .select('id, status, created_order_id, user_id, kind')
      .eq('id', sessionId)
      .maybeSingle()

    if (error || !session) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
    }
    if (session.user_id !== user.id) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    return NextResponse.json({
      status: session.status,
      orderId: session.created_order_id,
      kind: (session as { kind?: string }).kind || 'order_publication',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Ошибка' }, { status: 500 })
  }
}
