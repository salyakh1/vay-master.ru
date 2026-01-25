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

      // Получаем последние сообщения и количество непрочитанных для всех чатов одним запросом
      // Используем оконные функции для получения последнего сообщения для каждого чата
      const { data: allMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false })

      if (messagesError) throw messagesError

      // Получаем непрочитанные сообщения для всех чатов одним запросом
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('messages')
        .select('chat_id, id')
        .in('chat_id', chatIds)
        .eq('read', false)
        .neq('sender_id', user.id)

      if (unreadError) throw unreadError

      // Группируем последние сообщения по chat_id (берем первое для каждого чата, т.к. отсортировано по убыванию)
      const messagesByChat = new Map<string, Message>()
      const processedChats = new Set<string>()
      allMessages?.forEach((msg) => {
        if (!processedChats.has(msg.chat_id)) {
          messagesByChat.set(msg.chat_id, msg as Message)
          processedChats.add(msg.chat_id)
        }
      })

      // Подсчитываем непрочитанные сообщения для каждого чата
      const unreadCountsByChat = new Map<string, number>()
      unreadMessages?.forEach((msg) => {
        const current = unreadCountsByChat.get(msg.chat_id) || 0
        unreadCountsByChat.set(msg.chat_id, current + 1)
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
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4 sm:mb-6 text-graphite-secondary tracking-tight">
            {activeTab === 'chats' ? 'Сообщения' : 'Отклики'}
          </h1>

          {/* Tabs */}
          <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-border-color/60">
            <button
              onClick={() => setActiveTab('chats')}
              className={`px-3 sm:px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'chats'
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <FiMessageSquare size={16} />
                <span className="text-sm sm:text-base">Чаты</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`px-3 sm:px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'responses'
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <FiBriefcase size={16} />
                <span className="text-sm sm:text-base">Отклики</span>
              </div>
            </button>
          </div>

          {/* Chats Tab */}
          {activeTab === 'chats' && (
            <>
              {loading ? (
                <div className="bg-bg-card rounded-lg border border-border-light/40 p-8 sm:p-12 text-center text-text-secondary">
                  Загрузка...
                </div>
              ) : chats.length === 0 ? (
                <div className="bg-bg-card rounded-lg border border-border-light/40 p-8 sm:p-12 text-center text-text-secondary">
                  У вас пока нет сообщений
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  {chats.map((chat) => (
                    <Link
                      key={chat.id}
                      href={`/chats/${chat.id}`}
                      className="block bg-bg-card rounded-lg border border-border-light/40 p-4 sm:p-5 hover:bg-bg-secondary hover:border-border-color/60 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden flex-shrink-0 relative">
                          {chat.otherUser.avatar_url ? (
                            <img
                              src={chat.otherUser.avatar_url}
                              alt={chat.otherUser.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-graphite-primary flex items-center justify-center rounded-full text-white text-base sm:text-lg font-semibold">
                              {chat.otherUser.full_name[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold truncate text-graphite-secondary text-base sm:text-lg">{chat.otherUser.full_name}</div>
                            {(chat.unreadCount ?? 0) > 0 && (
                              <span className="bg-brand-accent text-white text-xs font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 flex-shrink-0">
                                {chat.unreadCount! > 99 ? '99+' : chat.unreadCount}
                              </span>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <div className="text-sm text-text-secondary truncate">
                              {chat.lastMessage.content}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {chat.lastMessage && (
                            <div className="text-xs text-text-secondary font-medium whitespace-nowrap">
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
                <div className="bg-bg-card rounded-lg border border-border-light/40 p-8 sm:p-12 text-center text-text-secondary">
                  Загрузка...
                </div>
              ) : responses.length === 0 ? (
                <div className="bg-bg-card rounded-lg border border-border-light/40 p-8 sm:p-12 text-center text-text-secondary">
                  Пока нет откликов на ваши заказы
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-5">
                  {responses.map((response) => {
                    const order = response.order as any
                    const master = response.master as any

                    return (
                      <Link
                        key={response.id}
                        href={`/orders/${response.order_id}`}
                        className="block bg-bg-card rounded-lg border border-border-light/40 p-4 sm:p-5 hover:bg-bg-secondary hover:border-border-color/60 transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden flex-shrink-0 relative">
                            {master?.avatar_url ? (
                              <img
                                src={master.avatar_url}
                                alt={master.full_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-graphite-primary flex items-center justify-center rounded-full text-white text-base sm:text-lg font-semibold">
                                {master?.full_name?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <div className="font-semibold truncate text-graphite-secondary text-base sm:text-lg">
                                {master?.full_name || 'Мастер'}
                              </div>
                              <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getResponseStatusColor(response.status)}`}>
                                {getResponseStatusLabel(response.status)}
                              </span>
                            </div>
                            {order?.title && (
                              <div className="text-sm text-text-secondary mb-1.5">
                                Заказ: {order.title}
                              </div>
                            )}
                            {response.price && (
                              <div className="text-base font-semibold text-brand-accent mb-1.5">
                                {response.price.toLocaleString('ru-RU')} ₽
                              </div>
                            )}
                            <div className="text-sm text-text-secondary truncate mb-2">
                              {response.message}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
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

