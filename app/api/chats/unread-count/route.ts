import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** GET: количество чатов с непрочитанными сообщениями (один запрос вместо N+1). */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ count: 0 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ count: 0 })
    }

    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, deleted_by_user_ids')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (chatsError || !chats?.length) {
      return NextResponse.json({ count: 0 })
    }

    const deletedByUser = (chat: { deleted_by_user_ids?: string[] }) =>
      (chat.deleted_by_user_ids || []).includes(user.id)
    const chatIds = chats.filter((c) => !deletedByUser(c)).map((c) => c.id)
    if (chatIds.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    const { data: unreadByChat } = await supabase
      .from('messages')
      .select('chat_id')
      .in('chat_id', chatIds)
      .eq('read', false)
      .neq('sender_id', user.id)

    const uniqueChatIds = new Set((unreadByChat || []).map((r) => r.chat_id))
    return NextResponse.json({ count: uniqueChatIds.size })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
