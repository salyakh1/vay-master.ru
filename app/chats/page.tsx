'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase, Chat, Message, User, OrderResponse, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format, isToday, differenceInHours, differenceInDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { FiBriefcase, FiMessageSquare, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi'

type TabType = 'chats' | 'responses'

export default function ChatsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('chats')
  const [chats, setChats] = useState<(Chat & { otherUser: User; lastMessage?: Message; unreadCount?: number })[]>([])
  const [responses, setResponses] = useState<(OrderResponse & { order?: Order; master?: User })[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingResponses, setLoadingResponses] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      if (activeTab === 'chats') {
        fetchChats()
      } else {
        fetchResponses()
      }

      // Подписываемся на изменения сообщений для обновления счетчиков
      const channel = supabase
        .channel('chats-list-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
          },
          () => {
            fetchChats()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          () => {
            fetchChats()
          }
        )
        .subscribe()

      // Слушаем кастомное событие обновления списка чатов
      const handleMessagesRead = (event: any) => {
        console.log('messagesRead event received, chatId:', event.detail?.chatId)
        // Обновляем список чатов с задержкой для гарантии обновления в базе данных
        setTimeout(() => {
          console.log('Refreshing chats list...')
          fetchChats()
        }, 500)
      }
      window.addEventListener('messagesRead', handleMessagesRead)
      
      // Также обновляем при возврате на страницу (когда пользователь выходит из чата)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          console.log('Page visible, refreshing...')
          if (activeTab === 'chats') {
            fetchChats()
          } else {
            fetchResponses()
          }
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // Обновляем при фокусе на окне
      const handleFocus = () => {
        console.log('Window focused, refreshing...')
        if (activeTab === 'chats') {
          fetchChats()
        } else {
          fetchResponses()
        }
      }
      window.addEventListener('focus', handleFocus)
      
      return () => {
        supabase.removeChannel(channel)
        window.removeEventListener('messagesRead', handleMessagesRead)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }

    }
  }, [user, activeTab])

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

      // Получаем последние сообщения и количество непрочитанных для всех чатов
      // Используем отдельные запросы для каждого чата, но выполняем их параллельно
      const messagesPromises = chatIds.map(async (chatId) => {
        const [lastMessageResult, unreadResult] = await Promise.all([
          supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', chatId)
            .eq('read', false)
            .neq('sender_id', user.id)
        ])
        
        return {
          chatId,
          message: lastMessageResult.data,
          unreadCount: (unreadResult.count ?? 0) as number
        }
      })
      
      const messagesResults = await Promise.all(messagesPromises)
      const messagesByChat = new Map<string, Message>()
      const unreadCountsByChat = new Map<string, number>()
      messagesResults.forEach(({ chatId, message, unreadCount }) => {
        if (message) {
          messagesByChat.set(chatId, message as Message)
        }
        unreadCountsByChat.set(chatId, unreadCount)
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
          unreadCount: unreadCountsByChat.get(chat.id) || 0,
        }
      })

      setChats(chatsWithUsers)
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMessageTime = (date: Date): string => {
    const now = new Date()
    const messageDate = new Date(date)
    
    // Если сообщение сегодня - показываем точное время
    if (isToday(messageDate)) {
      return format(messageDate, 'H:mm')
    }
    
    // Если прошло меньше 24 часов (но не сегодня)
    const hoursDiff = differenceInHours(now, messageDate)
    if (hoursDiff < 24) {
      return `${hoursDiff} ч`
    }
    
    // Если прошло больше 24 часов - показываем дни
    const daysDiff = differenceInDays(now, messageDate)
    if (daysDiff < 30) {
      return `${daysDiff} д`
    }
    
    // Если прошло больше месяца - показываем дату
    return format(messageDate, 'dd.MM.yyyy')
  }

  const fetchResponses = async () => {
    if (!user) return

    setLoadingResponses(true)
    try {
      // Для всех ролей - получаем отклики на заказы пользователя
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('client_id', user.id)

      if (!orders || orders.length === 0) {
        setResponses([])
        return
      }

      const orderIds = orders.map(o => o.id)

      const { data, error } = await supabase
        .from('order_responses')
        .select(`
          *,
          order:orders!inner(id, title, status),
          master:profiles!master_id(id, full_name, avatar_url, city)
        `)
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      setResponses((data || []) as any)
    } catch (error) {
      console.error('Error fetching responses:', error)
    } finally {
      setLoadingResponses(false)
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

  const getResponseStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ожидает решения'
      case 'accepted':
        return 'Принят'
      case 'rejected':
        return 'Отклонен'
      default:
        return status
    }
  }

  const getResponseStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-300'
      case 'rejected':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
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
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-semibold mb-6 text-graphite-secondary tracking-tight">
            {activeTab === 'chats' ? 'Сообщения' : 'Отклики'}
          </h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border-color">
            <button
              onClick={() => setActiveTab('chats')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'chats'
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <FiMessageSquare size={18} />
                <span>Чаты</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'responses'
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <FiBriefcase size={18} />
                <span>Отклики</span>
              </div>
            </button>
          </div>

          {/* Chats Tab */}
          {activeTab === 'chats' && (
            <>
              {loading ? (
                <div className="card text-center text-text-secondary py-12">
                  Загрузка...
                </div>
              ) : chats.length === 0 ? (
                <div className="card text-center text-text-secondary py-12">
                  У вас пока нет сообщений
                </div>
              ) : (
                <div className="space-y-3">
                  {chats.map((chat) => (
                    <Link
                      key={chat.id}
                      href={`/chats/${chat.id}`}
                      className="card hover:bg-bg-secondary transition cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 relative">
                          {chat.otherUser.avatar_url ? (
                            <img
                              src={chat.otherUser.avatar_url}
                              alt={chat.otherUser.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-graphite-primary flex items-center justify-center rounded-full text-white text-sm font-semibold">
                              {chat.otherUser.full_name[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold truncate text-graphite-secondary">{chat.otherUser.full_name}</div>
                            {(chat.unreadCount ?? 0) > 0 && (
                              <span className="bg-brand-accent text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                                {chat.unreadCount! > 99 ? '99+' : chat.unreadCount}
                              </span>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <div className="text-sm text-text-secondary truncate mt-1">
                              {chat.lastMessage.content}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {chat.lastMessage && (
                            <div className="text-xs text-text-muted">
                              {formatMessageTime(new Date(chat.lastMessage.created_at))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Responses Tab */}
          {activeTab === 'responses' && (
            <>
              {loadingResponses ? (
                <div className="card text-center text-text-secondary py-12">
                  Загрузка...
                </div>
              ) : responses.length === 0 ? (
                <div className="card text-center text-text-secondary py-12">
                  Пока нет откликов на ваши заказы
                </div>
              ) : (
                <div className="space-y-3">
                  {responses.map((response) => {
                    const order = response.order as any
                    const master = response.master as any

                    return (
                      <Link
                        key={response.id}
                        href={`/orders/${response.order_id}`}
                        className="card hover:bg-bg-secondary transition cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 relative">
                            {master?.avatar_url ? (
                              <img
                                src={master.avatar_url}
                                alt={master.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-graphite-primary flex items-center justify-center rounded-full text-white text-sm font-semibold">
                                {master?.full_name?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold truncate text-graphite-secondary">
                                {master?.full_name || 'Мастер'}
                              </div>
                              <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getResponseStatusColor(response.status)}`}>
                                {getResponseStatusLabel(response.status)}
                              </span>
                            </div>
                            {order?.title && (
                              <div className="text-sm text-text-secondary mb-1">
                                Заказ: {order.title}
                              </div>
                            )}
                            {response.price && (
                              <div className="text-base font-semibold text-brand-accent mb-1">
                                {response.price.toLocaleString('ru-RU')} ₽
                              </div>
                            )}
                            <div className="text-sm text-text-secondary truncate mt-1">
                              {response.message}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                              <FiClock size={12} />
                              <span>
                                {format(new Date(response.created_at), 'd MMMM в HH:mm', { locale: ru })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

