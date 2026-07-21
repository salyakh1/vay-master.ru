import type { SupabaseClient } from '@supabase/supabase-js'

/** Найти или создать чат между двумя пользователями (user1_id / user2_id). */
export async function findOrCreateDirectChat(
  admin: SupabaseClient,
  userA: string,
  userB: string
): Promise<string | null> {
  if (!userA || !userB || userA === userB) return null

  const { data: existing } = await admin
    .from('chats')
    .select('id')
    .or(
      `and(user1_id.eq.${userA},user2_id.eq.${userB}),and(user1_id.eq.${userB},user2_id.eq.${userA})`
    )
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created, error } = await admin
    .from('chats')
    .insert({ user1_id: userA, user2_id: userB })
    .select('id')
    .single()

  if (error || !created) {
    console.error('[directChat] create', error)
    return null
  }
  return created.id
}

export async function sendDirectChatMessage(
  admin: SupabaseClient,
  chatId: string,
  senderId: string,
  content: string
): Promise<boolean> {
  if (!chatId || !senderId || !content.trim()) return false

  const { error } = await admin.from('messages').insert({
    chat_id: chatId,
    sender_id: senderId,
    content: content.trim(),
    read: false,
  })

  if (error) {
    console.error('[directChat] message', error)
    return false
  }

  await admin
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId)

  return true
}
