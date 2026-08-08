'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useAuth } from '@/app/providers'
import { supabase, Message, User } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { FiPlus, FiImage, FiMoreVertical, FiTrash2, FiAlertCircle, FiSend } from 'react-icons/fi'
import { formatDateDivider, getInitials, isSystemStyleMessage } from '@/components/chats/chat-utils'
import { getCategoryIcon } from '@/components/orders/order-utils'

// Dynamic imports для модальных окон - загружаются только при открытии
const CalculatorModal = dynamic(() => import('@/components/CalculatorModal'), {
  ssr: false,
})

const ComplaintModal = dynamic(() => import('@/components/ComplaintModal'), {
  ssr: false,
})

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [messages, setMessages] = useState<(Message & { sender: User })[]>([])
  const [otherUser, setOtherUser] = useState<User | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlderMessages, setHasOlderMessages] = useState(true)
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [showComplaintModal, setShowComplaintModal] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [relatedOrder, setRelatedOrder] = useState<{ id: string; title: string; category?: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatMenuRef = useRef<HTMLDivElement>(null)

  // Переписка грузится только при переходе в этот чат; первая порция — по экрану
  const MESSAGES_PER_PAGE = 20

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && params.id) {
      fetchChat()
      subscribeToMessages()
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, params.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && !(event.target as HTMLElement).closest('.menu-container')) {
        setShowMenu(false)
      }
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target as Node)) {
        setShowChatMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadOlderMessages = async () => {
    if (!user || !params.id || !oldestMessageId || loadingOlder || !hasOlderMessages) return

    setLoadingOlder(true)
    try {
      // Get oldest message timestamp
      const oldestMessage = messages[0]
      if (!oldestMessage) return

      // Load messages before the oldest one
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, full_name, avatar_url)
        `)
        .eq('chat_id', params.id)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      if (error) throw error

      const olderMessages = (data as any) || []
      if (olderMessages.length > 0) {
        olderMessages.reverse()
        
        // Store scroll position before adding messages
        const container = messagesContainerRef.current
        const scrollHeight = container?.scrollHeight || 0
        
        // Add older messages at the beginning
        setMessages(prev => [...olderMessages, ...prev])
        
        // Restore scroll position after messages are added
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight
            container.scrollTop = newScrollHeight - scrollHeight
          }
        })

        // Check if there are more older messages
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', params.id)
          .lt('created_at', olderMessages[0].created_at)
        
        setHasOlderMessages((count || 0) > 0)
        setOldestMessageId(olderMessages[0].id)
      } else {
        setHasOlderMessages(false)
      }
    } catch (error) {
      console.error('Error loading older messages:', error)
    } finally {
      setLoadingOlder(false)
    }
  }

  const fetchChat = async () => {
    if (!user || !params.id) return

    try {
      // Get chat and other user
      const { data: chat } = await supabase
        .from('chats')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!chat) {
        router.push('/chats')
        return
      }

      const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id
      const { data: otherUserData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single()

      setOtherUser(otherUserData as User)

      const { data: orderCtx } = await supabase
        .from('orders')
        .select('id, title, category, status')
        .or(
          `and(client_id.eq.${user.id},selected_master_id.eq.${otherUserId}),and(client_id.eq.${otherUserId},selected_master_id.eq.${user.id})`
        )
        .in('status', ['in_progress', 'open', 'new'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setRelatedOrder(orderCtx ? { id: orderCtx.id, title: orderCtx.title, category: orderCtx.category } : null)

      // Get last messages (most recent first, then reverse for display)
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, full_name, avatar_url)
        `)
        .eq('chat_id', params.id)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      if (error) throw error
      
      const messagesData = (data as any) || []
      // Reverse to show oldest first (for chat display)
      messagesData.reverse()
      setMessages(messagesData)
      
      // Check if there are older messages
      if (messagesData.length > 0) {
        const oldestId = messagesData[0].id
        setOldestMessageId(oldestId)
        
        // Check if there are more messages before this one
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', params.id)
          .lt('created_at', messagesData[0].created_at)
        
        setHasOlderMessages((count || 0) > 0)
      } else {
        setHasOlderMessages(false)
      }

      // Автоматически помечаем все непрочитанные сообщения как прочитанные при загрузке чата
      // Используем API endpoint для обхода RLS
      const { data: session } = await supabase.auth.getSession()
      if (session?.session?.access_token) {
        try {
          const response = await fetch('/api/chats/mark-read', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({ chatId: params.id }),
          })

          const result = await response.json()
          if (result.success) {
            console.log('Messages marked as read:', result.updatedCount)
            // Отправляем событие несколько раз для гарантии обновления
            window.dispatchEvent(new CustomEvent('messagesRead', { detail: { chatId: params.id } }))
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('messagesRead', { detail: { chatId: params.id } }))
            }, 500)
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('messagesRead', { detail: { chatId: params.id } }))
            }, 1000)
          } else {
            console.error('Error marking messages as read:', result.error)
          }
        } catch (error) {
          console.error('Error calling mark-read API:', error)
        }
      }
    } catch (error) {
      console.error('Error fetching chat:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    if (!params.id) return

    const channel = supabase
      .channel(`chat:${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${params.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMessage.sender_id)
            .single()

          setMessages((prev) => [
            ...prev,
            { ...newMessage, sender: sender as User },
          ])

          if (newMessage.sender_id !== user?.id) {
            await supabase
              .from('messages')
              .update({ read: true })
              .eq('id', newMessage.id)
          }
        }
      )
      .subscribe()

    channelRef.current = channel
  }

  const sendMessage = async (e?: React.FormEvent, content?: string, imageUrl?: string) => {
    if (e) e.preventDefault()
    const messageContent = content !== undefined ? content : newMessage.trim()
    // Проверяем, что есть либо текст, либо изображение
    if ((!messageContent || messageContent === '') && !imageUrl) return
    if (!user || !params.id) return

    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message & { sender: User } = {
      id: tempId,
      chat_id: params.id as string,
      sender_id: user.id,
      content: messageContent || '', // Всегда строка, даже пустая
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      read: false,
      sender: user,
    }

    // Оптимистичное обновление - добавляем сообщение сразу
    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage('')
    scrollToBottom()

    try {
      // Если есть изображение, но нет текста - используем пустую строку вместо null
      const insertData: any = {
        chat_id: params.id as string,
        sender_id: user.id,
        content: messageContent || '', // Всегда строка, даже пустая
      }
      
      if (imageUrl) {
        insertData.image_url = imageUrl
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      // Заменяем временное сообщение на реальное
      if (data) {
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...data, sender: sender as User }
              : msg
          )
        )
      }

      // Update chat updated_at
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', params.id)

      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (token) {
        void fetch(`/api/chats/${params.id}/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            preview: messageContent || (imageUrl ? '' : ''),
            hasImage: Boolean(imageUrl),
          }),
        }).catch(() => {})
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Удаляем оптимистичное сообщение при ошибке
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user || !params.id) return

    const file = e.target.files[0]
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение')
      return
    }

    setUploadingImage(true)
    setShowMenu(false)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/chat-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert(`Ошибка при загрузке: ${uploadError.message}`)
        return
      }

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
      const imageUrl = urlData.publicUrl

      // Отправляем сообщение с изображением
      await sendMessage(undefined, '', imageUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Ошибка при загрузке изображения')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteChatForMe = async () => {
    if (!user || !params.id) return
    if (!confirm('Вы уверены, что хотите удалить этот чат? Он будет скрыт из вашего списка чатов.')) return

    try {
      // Получаем текущий чат
      const { data: chat } = await supabase
        .from('chats')
        .select('deleted_by_user_ids')
        .eq('id', params.id)
        .single()

      const deletedIds = (chat?.deleted_by_user_ids || []) as string[]
      if (!deletedIds.includes(user.id)) {
        deletedIds.push(user.id)
      }

      const { error } = await supabase
        .from('chats')
        .update({ deleted_by_user_ids: deletedIds })
        .eq('id', params.id)

      if (error) throw error

      alert('Чат удален из вашего списка')
      router.push('/chats')
    } catch (error) {
      console.error('Error deleting chat:', error)
      alert('Ошибка при удалении чата')
    }
  }

  const handleDeleteChatForAll = async () => {
    if (!user || !params.id) return
    if (!confirm('Вы уверены, что хотите удалить этот чат для всех участников? Это действие нельзя отменить.')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        throw new Error('Не авторизован')
      }

      const response = await fetch(`/api/chats/${params.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при удалении чата')
      }

      alert('Чат удален для всех участников')
      router.push('/chats')
    } catch (error: any) {
      console.error('Error deleting chat for all:', error)
      alert(error.message || 'Ошибка при удалении чата')
    }
  }

  const messageGroups = useMemo(() => {
    const groups: { key: string; label: string; items: (Message & { sender: User })[] }[] = []
    messages.forEach((message) => {
      const d = new Date(message.created_at)
      const key = format(d, 'yyyy-MM-dd')
      const label = formatDateDivider(d)
      const last = groups[groups.length - 1]
      if (!last || last.key !== key) {
        groups.push({ key, label, items: [message] })
      } else {
        last.items.push(message)
      }
    })
    return groups
  }, [messages])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto flex flex-col">
        <div className="bg-white border-b border-[#f0f0f0] h-14 animate-pulse" />
        <div className="flex-1 p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-12 rounded-2xl bg-white animate-pulse ${i % 2 ? 'ml-auto w-2/3' : 'w-2/3'}`}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!user || !otherUser) return null

  return (
    <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto w-full flex flex-col h-[100dvh]">
      <div className="bg-white border-b border-[#f0f0f0] px-3.5 py-2.5 flex items-center gap-2.5 flex-shrink-0 relative z-10">
        <Link href="/chats" className="text-[#e63946] text-xl leading-none flex-shrink-0" aria-label="Назад">
          ←
        </Link>
        <div className="relative flex-shrink-0">
          {otherUser.avatar_url ? (
            <Image
              src={otherUser.avatar_url}
              alt=""
              width={36}
              height={36}
              className="rounded-full object-cover w-9 h-9"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#e63946] flex items-center justify-center text-white text-xs font-bold">
              {getInitials(otherUser.full_name)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-extrabold text-[#111] truncate">{otherUser.full_name}</p>
          <p className="text-[10px] text-[#888] font-medium truncate">
            {otherUser.city || 'На платформе'}
          </p>
        </div>
        <div className="relative flex-shrink-0" ref={chatMenuRef}>
          <button
            type="button"
            onClick={() => setShowChatMenu(!showChatMenu)}
            className="w-8 h-8 rounded-full bg-[#f5f5f7] border border-[#eee] flex items-center justify-center text-[#555]"
            aria-label="Меню"
          >
            <FiMoreVertical size={18} />
          </button>
          {showChatMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-[#f0f0f0] rounded-xl shadow-lg min-w-[200px] z-50 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setShowChatMenu(false)
                  handleDeleteChatForMe()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f7] text-left text-[#111] text-sm"
              >
                <FiTrash2 size={16} />
                Удалить чат у меня
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChatMenu(false)
                  handleDeleteChatForAll()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f7] text-left text-[#111] text-sm"
              >
                <FiTrash2 size={16} />
                Удалить чат у всех
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChatMenu(false)
                  setShowComplaintModal(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f7] text-left text-[#e63946] text-sm"
              >
                <FiAlertCircle size={16} />
                Пожаловаться
              </button>
            </div>
          )}
        </div>
      </div>

      {relatedOrder && (
        <Link
          href={`/orders/${relatedOrder.id}`}
          className="mx-3.5 mt-2 mb-1 bg-white border border-[#f0f0f0] rounded-[14px] px-3 py-2.5 flex items-center gap-2 flex-shrink-0"
        >
          <span className="text-lg flex-shrink-0">{getCategoryIcon(relatedOrder.category)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-[#aaa] font-medium">Заказ</p>
            <p className="text-[12px] font-bold text-[#111] truncate">{relatedOrder.title}</p>
          </div>
          <span className="text-[#e63946] text-sm flex-shrink-0">→</span>
        </Link>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto pl-3 pr-1.5 py-2 flex flex-col gap-1.5 min-h-0">
        {hasOlderMessages && (
          <div className="text-center py-2">
            <button
              type="button"
              onClick={loadOlderMessages}
              disabled={loadingOlder}
              className="text-[11px] text-[#888] font-semibold disabled:opacity-50"
            >
              {loadingOlder ? 'Загрузка...' : 'Загрузить ранее'}
            </button>
          </div>
        )}

        {messageGroups.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-1.5 py-2 text-[9px] text-[#bbb] font-semibold">
              <span className="flex-1 h-px bg-[#f0f0f0]" />
              {group.label}
              <span className="flex-1 h-px bg-[#f0f0f0]" />
            </div>
            {group.items.map((message) => {
              const isOwn = message.sender_id === user.id
              const isSystem = !isOwn && message.content && isSystemStyleMessage(message.content)

              if (isSystem) {
                return (
                  <div key={message.id} className="bg-[#f5f5f7] rounded-xl px-3 py-2 my-1 text-center">
                    <p className="text-[10px] text-[#888] leading-relaxed whitespace-pre-wrap">
                      {message.content.replace(/\*\*/g, '')}
                    </p>
                  </div>
                )
              }

              return (
                <div
                  key={message.id}
                  className={`flex flex-col max-w-[75%] mb-1 ${isOwn ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  {message.image_url && (
                    <div className="relative w-[140px] h-[100px] rounded-xl overflow-hidden mb-1 bg-[#f0f0f0]">
                      <Image
                        src={message.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="140px"
                      />
                    </div>
                  )}
                  {message.content?.trim() && (
                    <div
                      className={`px-3 py-2 text-[12px] leading-relaxed rounded-2xl ${
                        isOwn
                          ? 'bg-[#e63946] text-white rounded-br-md'
                          : 'bg-white text-[#111] border border-[#f0f0f0] rounded-bl-md'
                      }`}
                    >
                      {message.content}
                      {isOwn && message.read && (
                        <span className="text-[9px] text-white/70 ml-1">✓✓</span>
                      )}
                    </div>
                  )}
                  <span className="text-[9px] text-[#bbb] mt-0.5 px-0.5">
                    {format(new Date(message.created_at), 'HH:mm', { locale: ru })}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-[#f0f0f0] px-3.5 py-2 flex items-center gap-2 flex-shrink-0 menu-container relative">
        {showMenu && (
          <div className="absolute bottom-full left-3.5 mb-2 bg-white border border-[#f0f0f0] rounded-xl shadow-lg p-1 min-w-[180px] z-50">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#111] rounded-lg hover:bg-[#f5f5f7]"
            >
              <FiImage size={18} />
              Фото
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false)
                setShowCalculator(true)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#111] rounded-lg hover:bg-[#f5f5f7]"
            >
              <span>🔢</span>
              Калькулятор
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          disabled={uploadingImage}
          className="w-8 h-8 rounded-full bg-[#f5f5f7] border border-[#eee] flex items-center justify-center text-[#888] flex-shrink-0"
          aria-label="Вложения"
        >
          <FiPlus size={18} />
        </button>

        <form onSubmit={sendMessage} className="flex-1 flex items-center gap-2 min-w-0">
          <div className="flex-1 bg-[#f5f5f7] rounded-[22px] px-3.5 py-2 border-[1.5px] border-[#ececec] min-w-0">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Сообщение..."
              className="w-full bg-transparent text-[12px] text-[#111] placeholder:text-[#bbb] outline-none"
              onFocus={() => setShowMenu(false)}
            />
          </div>
          <button
            type="submit"
            disabled={uploadingImage || !newMessage.trim()}
            className="w-9 h-9 rounded-full bg-[#e63946] flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40"
            aria-label="Отправить"
          >
            <FiSend size={16} />
          </button>
        </form>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onSendResult={(result) => sendMessage(undefined, result)}
      />

      {otherUser && (
        <ComplaintModal
          isOpen={showComplaintModal}
          onClose={() => setShowComplaintModal(false)}
          reportedUserId={otherUser.id}
          chatId={params.id as string}
        />
      )}
    </div>
  )
}

