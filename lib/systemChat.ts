import type { SupabaseClient } from '@supabase/supabase-js'

const FALLBACK_SYSTEM_USER_ID = '970f2f4c-b3e2-4b7f-af7b-45a45e50356c'

async function resolveSystemUserId(admin: SupabaseClient): Promise<string> {
  if (process.env.ADMIN_SYSTEM_USER_ID) return process.env.ADMIN_SYSTEM_USER_ID

  const { data } = await admin
    .from('admin_roles')
    .select('user_id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data?.user_id || FALLBACK_SYSTEM_USER_ID
}

/**
 * Пишет сообщение от «Администрации» в личный чат пользователя.
 * Тот же паттерн, что welcome-message / admin blast.
 */
export async function sendSystemChatMessage(
  admin: SupabaseClient,
  userId: string,
  content: string
): Promise<{ chatId: string; messageId?: string } | null> {
  if (!userId || !content.trim()) return null

  const systemUserId = await resolveSystemUserId(admin)
  if (systemUserId === userId) return null

  let chatId: string | null = null

  const { data: existing } = await admin
    .from('chats')
    .select('id')
    .or(
      `and(user1_id.eq.${systemUserId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${systemUserId})`
    )
    .maybeSingle()

  if (existing?.id) {
    chatId = existing.id
  } else {
    const { data: created, error } = await admin
      .from('chats')
      .insert({ user1_id: systemUserId, user2_id: userId })
      .select('id')
      .single()

    if (error || !created) {
      console.error('[systemChat] create chat', error)
      return null
    }
    chatId = created.id
  }

  if (!chatId) return null

  const { data: msg, error: msgErr } = await admin
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: systemUserId,
      content: content.trim(),
      read: false,
    })
    .select('id')
    .single()

  if (msgErr) {
    console.error('[systemChat] insert message', msgErr)
    return { chatId }
  }

  return { chatId, messageId: msg?.id }
}
