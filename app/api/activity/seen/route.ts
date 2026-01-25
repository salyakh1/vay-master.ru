import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

const TYPES = ['comments', 'likes', 'responses', 'reviews', 'followers', 'replies'] as const

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()

    let body: { type?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Неверное тело запроса' }, { status: 400 })
    }
    const type = body?.type as typeof TYPES[number] | undefined
    if (!type || !TYPES.includes(type)) return NextResponse.json({ error: 'Нужен type: comments|likes|responses|reviews|followers|replies' }, { status: 400 })
    if (type === 'responses' && profile?.role !== 'master') return NextResponse.json({ error: 'Отклики только для мастеров' }, { status: 403 })

    await supabaseAdmin.from('activity_seen').upsert(
      { user_id: user.id, activity_type: type, seen_at: new Date().toISOString() },
      { onConflict: 'user_id,activity_type' }
    )

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('activity/seen', e)
    return NextResponse.json({ error: e?.message || 'Ошибка' }, { status: 500 })
  }
}
