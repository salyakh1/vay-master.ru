import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isProActive } from '@/lib/masterAccess'
import { GROUP_CHAT_COOLDOWN_MS, GROUP_CHAT_TTL_MS } from '@/lib/groupChats'

export const dynamic = 'force-dynamic'

function userClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

async function requireProMaster(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const token = authHeader.slice(7).trim()
  const supabase = userClient(token)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_pro, pro_until, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'master' || !isProActive(profile)) {
    return { error: NextResponse.json({ error: 'PRO required' }, { status: 403 }) }
  }

  return { supabase, user, profile }
}

type RouteCtx = { params: { id: string } }

/** GET — живые сообщения профчата */
export async function GET(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireProMaster(request)
  if ('error' in auth && auth.error) return auth.error
  const { supabase, user } = auth as Exclude<Awaited<ReturnType<typeof requireProMaster>>, { error: NextResponse }>

  const { data: chat } = await supabase
    .from('group_chats')
    .select('id, name, icon, description, city, members_count, specialization_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })

  const { data: messages, error } = await supabase
    .from('group_messages')
    .select(
      `
      id,
      content,
      created_at,
      expires_at,
      reply_to_id,
      sender_id,
      profiles!group_messages_sender_id_fkey (
        id, full_name, avatar_url, is_pro
      ),
      reply:group_messages!group_messages_reply_to_id_fkey (
        id, content,
        profiles!group_messages_sender_id_fkey ( full_name )
      )
    `
    )
    .eq('chat_id', params.id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('group messages GET', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: cooldown } = await supabase
    .from('group_message_cooldowns')
    .select('last_message_at')
    .eq('user_id', user.id)
    .eq('chat_id', params.id)
    .maybeSingle()

  const lastMsg = cooldown?.last_message_at as string | undefined
  const canWrite = !lastMsg || new Date(lastMsg).getTime() + GROUP_CHAT_COOLDOWN_MS < Date.now()
  const nextAvailable = lastMsg ? new Date(new Date(lastMsg).getTime() + GROUP_CHAT_COOLDOWN_MS).toISOString() : null

  return NextResponse.json({
    chat,
    messages: messages ?? [],
    canWrite,
    nextAvailable,
  })
}

/** POST — отправить сообщение (кулдаун 12 ч, TTL 48 ч) */
export async function POST(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireProMaster(request)
  if ('error' in auth && auth.error) return auth.error
  const { supabase, user } = auth as Exclude<Awaited<ReturnType<typeof requireProMaster>>, { error: NextResponse }>

  const { data: chat } = await supabase.from('group_chats').select('id').eq('id', params.id).eq('is_active', true).maybeSingle()
  if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 })

  const { data: cooldown } = await supabase
    .from('group_message_cooldowns')
    .select('last_message_at')
    .eq('user_id', user.id)
    .eq('chat_id', params.id)
    .maybeSingle()

  if (cooldown?.last_message_at) {
    const nextAvailable = new Date(new Date(cooldown.last_message_at).getTime() + GROUP_CHAT_COOLDOWN_MS)
    if (nextAvailable > new Date()) {
      const secondsLeft = Math.ceil((nextAvailable.getTime() - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'cooldown',
          secondsLeft,
          nextAvailable: nextAvailable.toISOString(),
        },
        { status: 429 }
      )
    }
  }

  let body: { content?: string; reply_to_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (!content) return NextResponse.json({ error: 'Empty message' }, { status: 400 })
  if (content.length > 2000) return NextResponse.json({ error: 'Too long' }, { status: 400 })

  const replyToId = typeof body.reply_to_id === 'string' ? body.reply_to_id : null

  const { data: message, error } = await supabase
    .from('group_messages')
    .insert({
      chat_id: params.id,
      sender_id: user.id,
      content,
      reply_to_id: replyToId,
      expires_at: new Date(Date.now() + GROUP_CHAT_TTL_MS).toISOString(),
    })
    .select(
      `
      id, content, created_at, expires_at, sender_id, reply_to_id,
      profiles!group_messages_sender_id_fkey (
        id, full_name, avatar_url, is_pro
      )
    `
    )
    .single()

  if (error) {
    console.error('group messages POST', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('group_message_cooldowns').upsert(
    {
      user_id: user.id,
      chat_id: params.id,
      last_message_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,chat_id' }
  )

  return NextResponse.json({
    message,
    canWrite: false,
    nextAvailable: new Date(Date.now() + GROUP_CHAT_COOLDOWN_MS).toISOString(),
  })
}
