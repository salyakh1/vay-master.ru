'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase, Chat, Message, User } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'

export default function ChatsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<(Chat & { otherUser: User; lastMessage?: Message })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [user])

  const fetchChats = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (error) throw error

      // Фильтруем чаты, которые были удалены пользователем
      const filteredChats = (data || []).filter((chat) => {
        const deletedByUserIds = (chat.deleted_by_user_ids || []) as string[]
        return !deletedByUserIds.includes(user.id)
      })

      // Оптимизация: получаем все данные параллельно
      const chatIds = filteredChats.map((chat) => chat.id)
      const otherUserIds = filteredChats.map((chat) =>
        chat.user1_id === user.id ? chat.user2_id : chat.user1_id
      )

      // Получаем всех пользователей одним запросом
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherUserIds)

      // Получаем последние сообщения для всех чатов
      // Используем отдельные запросы для каждого чата, но выполняем их параллельно
      const messagesPromises = chatIds.map(async (chatId) => {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        return { chatId, message: data }
      })
      
      const messagesResults = await Promise.all(messagesPromises)
      const messagesByChat = new Map<string, Message>()
      messagesResults.forEach(({ chatId, message }) => {
        if (message) {
          messagesByChat.set(chatId, message as Message)
        }
      })

      // Создаем map пользователей для быстрого доступа
      const usersMap = new Map<string, User>()
      allUsers?.forEach((u) => {
        usersMap.set(u.id, u as User)
      })

      // Формируем результат
      const chatsWithUsers = filteredChats.map((chat) => {
        const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
        return {
          ...chat,
          otherUser: usersMap.get(otherUserId) as User,
          lastMessage: messagesByChat.get(chat.id),
        }
      })

      setChats(chatsWithUsers)
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const startChat = async (otherUserId: string) => {
    if (!user) return

    try {
      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
        .single()

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`)
        return
      }

      // Create new chat
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user1_id: user.id,
          user2_id: otherUserId,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/chats/${data.id}`)
    } catch (error) {
      console.error('Error starting chat:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Сообщения</h1>

          {chats.length === 0 ? (
            <div className="card text-center text-gray-500">
              У вас пока нет сообщений
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chats/${chat.id}`}
                  className="card hover:bg-gray-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-black border border-gray-200 flex items-center justify-center text-white text-sm font-bold">
                      {chat.otherUser.avatar_url ? (
                        <img
                          src={chat.otherUser.avatar_url}
                          alt={chat.otherUser.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        chat.otherUser.full_name[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{chat.otherUser.full_name}</div>
                      {chat.lastMessage && (
                        <div className="text-sm text-gray-500 truncate">
                          {chat.lastMessage.content}
                        </div>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <div className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(chat.lastMessage.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

