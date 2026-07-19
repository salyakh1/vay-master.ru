import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data } = await client.auth.getUser()
  return data.user ?? null
}

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Сохранить push-подписку */
export async function POST(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service role не настроен' }, { status: 500 })
    }

    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const body = await request.json()
    const endpoint = body?.endpoint as string | undefined
    const p256dh = body?.keys?.p256dh as string | undefined
    const auth = body?.keys?.auth as string | undefined

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Некорректная подписка' }, { status: 400 })
    }

    const admin = getAdmin()
    const { error } = await admin.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: request.headers.get('user-agent')?.slice(0, 300) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[push/subscribe]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ошибка' },
      { status: 500 }
    )
  }
}

/** Удалить push-подписку */
export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service role не настроен' }, { status: 500 })
    }

    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const endpoint = body?.endpoint as string | undefined
    const admin = getAdmin()

    let q = admin.from('push_subscriptions').delete().eq('user_id', user.id)
    if (endpoint) q = q.eq('endpoint', endpoint)
    const { error } = await q
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[push/unsubscribe]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ошибка' },
      { status: 500 }
    )
  }
}
