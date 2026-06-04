'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { supabase, Chat, Message, User, OrderResponse, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import ChatListItem from './ChatListItem'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiBriefcase, FiMessageSquare, FiClock } from 'react-icons/fi'

type TabType = 'chats' | 'responses'

const CHATS_PAGE_SIZE = 12
const RESPONSES_PAGE_SIZE = 12

function getResponseStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Ожидает'
    case 'accepted':
      return 'Принят'
    case 'rejected':
      return 'Отклонен'
    default:
      return status
  }
}

function getResponseStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-[#fff8e6] text-[#cc8800]'
    case 'accepted':
      return 'bg-[#edfff5] text-[#22a85e]'
    case 'rejected':
      return 'bg-[#f5f5f7] text-[#aaa]'
    default:
      return 'bg-[#f5f5f7] text-[#aaa]'
  }
}

export default function ChatsClient() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('chats')
  const [chats, setChats] = useState<(Chat & { otherUser: User; lastMessage?: Message; unreadCount?: number })[]>([])
  const [responses, setResponses] = useState<(OrderResponse & { order?: Order; master?: User })[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [chatsPage, setChatsPage] = useState(1)
  const [hasMoreChats, setHasMoreChats] = useState(false)
  const [loadingMoreChats, setLoadingMoreChats] = useState(false)
  const [responsesPage, setResponsesPage] = useState(1)
  const [hasMoreResponses, setHasMoreResponses] = useState(false)
  const [loadingMoreResponses, setLoadingMoreResponses] = useState(false)
  const loadMoreChatsSentinelRef = useRef<HTMLDivElement>(null)
  const loadMoreResponsesSentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  const fetchChats = async (append: boolean = false) => {
    if (!user) return

    const page = append ? chatsPage : 1
    if (!append) setLoading(true)
    else setLoadingMoreChats(true)

    try {
      const from = (page - 1) * CHATS_PAGE_SIZE
      const to = from + CHATS_PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from('chats')
        .select('*', { count: 'exact' })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const rawChats = data || []
      const total = count ?? 0
      setHasMoreChats(rawChats.length === CHATS_PAGE_SIZE && total > page * CHATS_PAGE_SIZE)

      const filteredChats = rawChats.filter((chat) => {
        const deletedByUserIds = (chat.deleted_by_user_ids || []) as string[]
        return !deletedByUserIds.includes(user.id)
      })

      const chatIds = filteredChats.map((c) => c.id)
      const otherUserIds = filteredChats.map((c) => (c.user1_id === user.id ? c.user2_id : c.user1_id))

      if (otherUserIds.length === 0) {
        if (!append) setChats([])
        return
      }

      const [{ data: allUsers }, { data: allMessages, error: messagesError }, { data: unreadMessages, error: unreadError }] =
        await Promise.all([
          supabase.from('profiles').select('*').in('id', otherUserIds),
          supabase
            .from('messages')
            .select('*')
            .in('chat_id', chatIds)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('messages')
            .select('chat_id, id')
            .in('chat_id', chatIds)
            .eq('read', false)
            .neq('sender_id', user.id),
        ])

      if (messagesError) throw messagesError
      if (unreadError) throw unreadError

      const messagesByChat = new Map<string, Message>()
      allMessages?.forEach((msg) => {
        if (!messagesByChat.has(msg.chat_id)) messagesByChat.set(msg.chat_id, msg as Message)
      })
      const unreadCountsByChat = new Map<string, number>()
      unreadMessages?.forEach((msg) => {
        unreadCountsByChat.set(msg.chat_id, (unreadCountsByChat.get(msg.chat_id) || 0) + 1)
      })
      const usersMap = new Map<string, User>()
      allUsers?.forEach((u) => {
        usersMap.set(u.id, u as User)
      })

      const chatsWithUsers = filteredChats.map((chat) => {
        const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
        return {
          ...chat,
          otherUser: usersMap.get(otherUserId) as User,
          lastMessage: messagesByChat.get(chat.id),
          unreadCount: unreadCountsByChat.get(chat.id) || 0,
        }
      })

      if (append) {
        setChats((prev) => [...prev, ...chatsWithUsers])
        setChatsPage((p) => p + 1)
      } else {
        setChats(chatsWithUsers)
        setChatsPage(2)
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
      setLoadingMoreChats(false)
    }
  }

  const fetchResponses = async (append: boolean = false) => {
    if (!user) return

    const page = append ? responsesPage : 1
    if (!append) setLoadingResponses(true)
    else setLoadingMoreResponses(true)

    try {
      const { data: orders } = await supabase.from('orders').select('id').eq('client_id', user.id)

      if (!orders || orders.length === 0) {
        setResponses([])
        return
      }

      const orderIds = orders.map((o) => o.id)
      const from = (page - 1) * RESPONSES_PAGE_SIZE
      const to = from + RESPONSES_PAGE_SIZE - 1

      const { data, error, count } = await supabase
        .from('order_responses')
        .select(
          `*, order:orders!inner(id, title, status), master:profiles!master_id(id, full_name, avatar_url, city)`,
          { count: 'exact' }
        )
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const list = (data || []) as (OrderResponse & { order?: Order; master?: User })[]
      const total = count ?? 0
      setHasMoreResponses(list.length === RESPONSES_PAGE_SIZE && total > page * RESPONSES_PAGE_SIZE)

      if (append) {
        setResponses((prev) => [...prev, ...list])
        setResponsesPage((p) => p + 1)
      } else {
        setResponses(list)
        setResponsesPage(2)
      }
    } catch (error) {
      console.error('Error fetching responses:', error)
    } finally {
      setLoadingResponses(false)
      setLoadingMoreResponses(false)
    }
  }

  useEffect(() => {
    if (!user) return

    if (activeTab === 'chats') fetchChats()
    else fetchResponses()

    const channel = supabase
      .channel('chats-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        if (activeTab === 'chats') fetchChats()
      })
      .subscribe()

    const handleMessagesRead = () => {
      setTimeout(() => {
        if (activeTab === 'chats') fetchChats()
      }, 500)
    }
    window.addEventListener('messagesRead', handleMessagesRead)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (activeTab === 'chats') fetchChats()
        else fetchResponses()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('messagesRead', handleMessagesRead)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [user, activeTab])

  const loadMoreChats = () => {
    if (!loadingMoreChats && hasMoreChats) fetchChats(true)
  }

  const loadMoreResponses = () => {
    if (!loadingMoreResponses && hasMoreResponses) fetchResponses(true)
  }

  useEffect(() => {
    const el = loadMoreChatsSentinelRef.current
    if (!el || !hasMoreChats || loadingMoreChats || activeTab !== 'chats') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreChats()
      },
      { rootMargin: '300px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMoreChats, loadingMoreChats, chatsPage, chats.length, activeTab])

  useEffect(() => {
    const el = loadMoreResponsesSentinelRef.current
    if (!el || !hasMoreResponses || loadingMoreResponses || activeTab !== 'responses') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreResponses()
      },
      { rootMargin: '300px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMoreResponses, loadingMoreResponses, responsesPage, responses.length, activeTab])

  const totalUnread = useMemo(
    () => chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0),
    [chats]
  )

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return chats
    return chats.filter((chat) => {
      const name = chat.otherUser.full_name?.toLowerCase() ?? ''
      const msg = chat.lastMessage?.content?.toLowerCase() ?? ''
      return name.includes(q) || msg.includes(q)
    })
  }, [chats, searchQuery])

  if (authLoading || (loading && activeTab === 'chats')) return null
  if (!user) return null

  return (
    <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto w-full pb-24">
      <Navbar />

      <div className="bg-white border-b border-[#f0f0f0] px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center">
            <h1 className="text-[17px] font-extrabold text-[#111]">
              {activeTab === 'chats' ? 'Чаты' : 'Отклики'}
            </h1>
            {activeTab === 'chats' && totalUnread > 0 && (
              <span className="ml-1.5 bg-[#e63946] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-[10px]">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-0 border-b border-[#f0f0f0] -mx-1 mb-3">
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`flex-1 text-center py-2 text-[11px] font-semibold border-b-2 transition-colors ${
              activeTab === 'chats'
                ? 'text-[#e63946] border-[#e63946]'
                : 'text-[#aaa] border-transparent'
            }`}
          >
            <span className="inline-flex items-center gap-1 justify-center">
              <FiMessageSquare size={14} />
              Чаты
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('responses')}
            className={`flex-1 text-center py-2 text-[11px] font-semibold border-b-2 transition-colors ${
              activeTab === 'responses'
                ? 'text-[#e63946] border-[#e63946]'
                : 'text-[#aaa] border-transparent'
            }`}
          >
            <span className="inline-flex items-center gap-1 justify-center">
              <FiBriefcase size={14} />
              Отклики
            </span>
          </button>
        </div>

        {activeTab === 'chats' && (
          <div className="flex items-center gap-2 bg-[#f5f5f7] rounded-xl px-3 py-2 border-[1.5px] border-[#ececec]">
            <span className="text-[#e63946] text-sm">⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по чатам..."
              className="flex-1 bg-transparent text-[12px] text-[#111] placeholder:text-[#bbb] outline-none"
            />
          </div>
        )}
      </div>

      {activeTab === 'chats' && (
        <>
          {loading && chats.length === 0 ? (
            <div className="bg-white">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 border-b border-[#f8f8f8] animate-pulse bg-[#fafafa]" />
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-[15px] font-extrabold text-[#111] mb-2">
                {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
              </p>
              <p className="text-[12px] text-[#aaa] leading-relaxed mb-6 max-w-[260px]">
                {searchQuery
                  ? 'Попробуйте другой запрос'
                  : 'Напишите мастеру или продавцу — чат откроется автоматически'}
              </p>
              {!searchQuery && (
                <>
                  <Link
                    href="/search"
                    className="bg-[#e63946] text-white text-[13px] font-bold px-6 py-3 rounded-2xl"
                  >
                    Найти мастера
                  </Link>
                  <Link href="/products" className="mt-2.5 text-[#e63946] text-[12px] font-semibold">
                    Открыть каталог товаров
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white">
              {filteredChats.map((chat) => (
                <ChatListItem key={chat.id} chat={chat} currentUserId={user.id} />
              ))}
              {loadingMoreChats && (
                <p className="text-center text-xs text-[#888] py-3">Загрузка…</p>
              )}
              {hasMoreChats && <div ref={loadMoreChatsSentinelRef} className="h-2" aria-hidden />}
            </div>
          )}
        </>
      )}

      {activeTab === 'responses' && (
        <>
          {loadingResponses && responses.length === 0 ? (
            <div className="bg-white">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 border-b border-[#f8f8f8] animate-pulse" />
              ))}
            </div>
          ) : responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-[15px] font-extrabold text-[#111] mb-2">Пока нет откликов</p>
              <p className="text-[12px] text-[#aaa] leading-relaxed mb-6">
                Создайте заказ — мастера начнут откликаться
              </p>
              <Link href="/orders/new" className="bg-[#e63946] text-white text-[13px] font-bold px-6 py-3 rounded-2xl">
                Создать заказ
              </Link>
            </div>
          ) : (
            <div className="bg-white divide-y divide-[#f8f8f8]">
              {responses.map((response) => {
                const order = response.order as Order | undefined
                const master = response.master as User | undefined
                return (
                  <Link
                    key={response.id}
                    href={`/orders/${response.order_id}`}
                    className="flex gap-3 px-4 py-3 active:bg-[#fafafa]"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#e63946] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
                      {master?.avatar_url ? (
                        <img src={master.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        master?.full_name?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[13px] font-bold text-[#111] truncate">
                          {master?.full_name || 'Мастер'}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-lg ${getResponseStatusColor(response.status)}`}
                        >
                          {getResponseStatusLabel(response.status)}
                        </span>
                      </div>
                      {order?.title && (
                        <p className="text-[11px] text-[#888] truncate mb-0.5">Заказ: {order.title}</p>
                      )}
                      {response.price != null && (
                        <p className="text-[12px] font-bold text-[#e63946] mb-0.5">
                          {response.price.toLocaleString('ru-RU')} ₽
                        </p>
                      )}
                      <p className="text-[11px] text-[#888] truncate">{response.message}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-[#bbb]">
                        <FiClock size={10} />
                        {format(new Date(response.created_at), 'd MMM в HH:mm', { locale: ru })}
                      </div>
                    </div>
                  </Link>
                )
              })}
              {hasMoreResponses && <div ref={loadMoreResponsesSentinelRef} className="h-2" aria-hidden />}
            </div>
          )}
        </>
      )}
    </div>
  )
}
