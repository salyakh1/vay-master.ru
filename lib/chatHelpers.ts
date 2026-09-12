import { supabase } from '@/lib/supabase'

/** Найти или создать чат между двумя пользователями (клиентский supabase). */
export async function findOrCreateChat(currentUserId: string, otherUserId: string): Promise<string> {
  if (!currentUserId || !otherUserId || currentUserId === otherUserId) {
    throw new Error('Некорректные участники чата')
  }

  const { data: existingChat } = await supabase
    .from('chats')
    .select('id')
    .or(
      `and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`
    )
    .maybeSingle()

  if (existingChat?.id) return existingChat.id

  const { data, error } = await supabase
    .from('chats')
    .insert({ user1_id: currentUserId, user2_id: otherUserId })
    .select('id')
    .single()

  if (error) throw error
  if (!data?.id) throw new Error('Не удалось создать чат')
  return data.id
}
