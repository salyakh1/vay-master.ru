'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useAuth } from '@/app/providers'
import { supabase, Message, User } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiPlus, FiImage, FiMoreVertical, FiTrash2, FiAlertCircle, FiSend } from 'react-icons/fi'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatMenuRef = useRef<HTMLDivElement>(null)

  const MESSAGES_PER_PAGE = 30

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!user || !otherUser) return null

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col pb-20">
      <Navbar />
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Chat Header */}
        <div className="bg-bg-primary border-b border-border-color px-4 py-3 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative w-12 h-12 bg-text-primary border border-border-color flex items-center justify-center text-white text-sm font-semibold rounded-full overflow-hidden">
                {otherUser.avatar_url ? (
                  <Image
                    src={otherUser.avatar_url}
                    alt={otherUser.full_name}
                    fill
                    className="object-cover rounded-full"
                    sizes="48px"
                    priority
                  />
                ) : (
                  otherUser.full_name[0]?.toUpperCase() || '?'
                )}
              </div>
              <div>
                <div className="font-semibold text-graphite-secondary tracking-tight">{otherUser.full_name}</div>
                <div className="text-sm text-text-secondary">{otherUser.city || ''}</div>
              </div>
            </div>

            {/* Menu Button */}
            <div className="relative" ref={chatMenuRef}>
              <button
                type="button"
                onClick={() => setShowChatMenu(!showChatMenu)}
                className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
              >
                <FiMoreVertical size={20} className="text-graphite-secondary" strokeWidth={2} />
              </button>
              {showChatMenu && (
                <div className="absolute right-0 top-full mt-2 bg-bg-card border border-border-light rounded-md shadow-card min-w-[200px] z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatMenu(false)
                      handleDeleteChatForMe()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary rounded-md transition-colors text-left text-graphite-secondary font-medium"
                  >
                    <FiTrash2 size={18} />
                    <span>Удалить чат у меня</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatMenu(false)
                      handleDeleteChatForAll()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary rounded-md transition-colors text-left text-graphite-secondary font-medium"
                  >
                    <FiTrash2 size={18} />
                    <span>Удалить чат у всех</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatMenu(false)
                      setShowComplaintModal(true)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary rounded-lg transition-colors text-left text-red-600"
                  >
                    <FiAlertCircle size={18} />
                    <span>Пожаловаться</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Load Older Messages Button */}
          {hasOlderMessages && (
            <div className="text-center py-2">
              <button
                onClick={loadOlderMessages}
                disabled={loadingOlder}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                {loadingOlder ? 'Загрузка...' : 'Загрузить старые сообщения'}
              </button>
            </div>
          )}
          
          {messages.map((message) => {
            const isOwn = message.sender_id === user.id
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 border transition-colors rounded-lg ${
                    isOwn
                      ? 'bg-brand-accent text-white border-brand-accent'
                      : 'bg-bg-primary border-border-color'
                  }`}
                >
                  {!isOwn && (
                    <div className="text-xs font-semibold mb-1 text-text-secondary">
                      {message.sender.full_name}
                    </div>
                  )}
                  {message.image_url && (
                    <div className="relative w-full rounded-lg mb-2 overflow-hidden" style={{ maxHeight: '300px', minHeight: '200px' }}>
                      <Image
                        src={message.image_url}
                        alt="Message attachment"
                        fill
                        className="object-contain rounded-lg"
                        sizes="(max-width: 768px) 80vw, 400px"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {message.content && (
                  <div className={isOwn ? 'text-white' : 'text-graphite-secondary'}>{message.content}</div>
                  )}
                  <div
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-white/70' : 'text-text-secondary'
                    }`}
                  >
                    {format(new Date(message.created_at), 'HH:mm', { locale: ru })}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-bg-primary border-t border-border-color px-4 py-3 relative menu-container">
          {/* Menu Modal */}
          {showMenu && (
            <div className="absolute bottom-full left-4 mb-2 bg-bg-card border border-border-light rounded-md shadow-card p-2 min-w-[200px] z-50">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary rounded-lg transition-colors text-left"
              >
                <FiImage size={20} className="text-graphite-secondary" strokeWidth={2} />
                <span className="text-graphite-secondary font-medium">Отправить фото</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  setShowCalculator(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary rounded-lg transition-colors text-left"
              >
                <span className="text-2xl">🔢</span>
                <span className="text-graphite-secondary font-medium">Калькулятор</span>
              </button>
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="h-10 w-10 flex items-center justify-center bg-bg-secondary hover:bg-bg-primary text-graphite-secondary border border-border-light rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              disabled={uploadingImage}
            >
              <FiPlus size={20} />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Написать сообщение..."
                className="input h-10 text-sm pr-10 w-full"
                onFocus={() => setShowMenu(false)}
              />
              <button
                type="submit"
                disabled={uploadingImage || !newMessage.trim()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-brand-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? (
                  <span className="text-xs">Загрузка...</span>
                ) : (
                  <FiSend size={18} />
                )}
              </button>
            </div>
          </form>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Calculator Modal */}
        <CalculatorModal
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
          onSendResult={(result) => sendMessage(undefined, result)}
        />

        {/* Complaint Modal */}
        {otherUser && (
          <ComplaintModal
            isOpen={showComplaintModal}
            onClose={() => setShowComplaintModal(false)}
            reportedUserId={otherUser.id}
            chatId={params.id as string}
          />
        )}
      </div>
    </div>
  )
}

