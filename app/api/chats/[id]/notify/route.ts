import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/notify'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

/** Push получателю после нового сообщения в чате (сообщение уже в БД). */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service role не настроен' }, { status: 500 })
    }

    const chatId = params.id
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: authData } = await userClient.auth.getUser()
    const senderId = authData?.user?.id
    if (!senderId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const preview = typeof body.preview === 'string' ? body.preview.trim() : ''
    const hasImage = body.hasImage === true

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: chat, error: chatErr } = await admin
      .from('chats')
      .select('id, user1_id, user2_id')
      .eq('id', chatId)
      .maybeSingle()

    if (chatErr || !chat) {
      return NextResponse.json({ error: 'Чат не найден' }, { status: 404 })
    }

    if (chat.user1_id !== senderId && chat.user2_id !== senderId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const recipientId = chat.user1_id === senderId ? chat.user2_id : chat.user1_id

    const { data: senderProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', senderId)
      .maybeSingle()

    const senderName = senderProfile?.full_name || 'Новое сообщение'
    const pushBody = preview || (hasImage ? 'Отправлено фото' : 'Новое сообщение')

    await sendPushToUser(admin, recipientId, {
      title: senderName,
      body: pushBody.slice(0, 120),
      url: `/chats/${chatId}`,
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('[chat notify]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ошибка' },
      { status: 500 }
    )
  }
}
