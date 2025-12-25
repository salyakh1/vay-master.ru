'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase, Message, User } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiPlus, FiImage, FiMoreVertical, FiTrash2, FiAlertCircle } from 'react-icons/fi'
import CalculatorModal from '@/components/CalculatorModal'
import ComplaintModal from '@/components/ComplaintModal'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [messages, setMessages] = useState<(Message & { sender: User })[]>([])
  const [otherUser, setOtherUser] = useState<User | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [showComplaintModal, setShowComplaintModal] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatMenuRef = useRef<HTMLDivElement>(null)

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

      // Get messages
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, full_name, avatar_url)
        `)
        .eq('chat_id', params.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages((data as any) || [])

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('chat_id', params.id)
        .neq('sender_id', user.id)
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
      // Удаляем все сообщения
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', params.id)

      if (messagesError) throw messagesError

      // Удаляем чат
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', params.id)

      if (chatError) throw chatError

      alert('Чат удален для всех участников')
      router.push('/chats')
    } catch (error) {
      console.error('Error deleting chat for all:', error)
      alert('Ошибка при удалении чата')
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
          <div className="flex items-center gap-3">
            {/* Menu Button */}
            <div className="relative" ref={chatMenuRef}>
              <button
                type="button"
                onClick={() => setShowChatMenu(!showChatMenu)}
                className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
              >
                <FiMoreVertical size={20} className="text-text-primary" />
              </button>
              {showChatMenu && (
                <div className="absolute left-0 top-full mt-2 bg-white border border-border-color rounded-lg shadow-card min-w-[200px] z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChatMenu(false)
                      handleDeleteChatForMe()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary rounded-lg transition-colors text-left text-text-primary"
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
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary rounded-lg transition-colors text-left text-text-primary"
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

            <div className="w-12 h-12 bg-text-primary border border-border-color flex items-center justify-center text-white text-sm font-semibold rounded-full">
              {otherUser.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                otherUser.full_name[0]?.toUpperCase() || '?'
              )}
            </div>
            <div>
              <div className="font-semibold text-text-primary">{otherUser.full_name}</div>
              <div className="text-sm text-text-secondary">{otherUser.city || ''}</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
                    <img
                      src={message.image_url}
                      alt="Message attachment"
                      className="max-w-full h-auto rounded-lg mb-2"
                      style={{ maxHeight: '300px' }}
                    />
                  )}
                  {message.content && (
                  <div className={isOwn ? 'text-white' : 'text-text-primary'}>{message.content}</div>
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
            <div className="absolute bottom-full left-4 mb-2 bg-white border border-border-color rounded-lg shadow-card p-2 min-w-[200px] z-50">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click()
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary rounded-lg transition-colors text-left"
              >
                <FiImage size={20} className="text-text-primary" />
                <span className="text-text-primary">Отправить фото</span>
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
                <span className="text-text-primary">Калькулятор</span>
              </button>
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="btn bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-color flex items-center justify-center"
              disabled={uploadingImage}
            >
              <FiPlus size={20} />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Написать сообщение..."
              className="flex-1 input"
              onFocus={() => setShowMenu(false)}
            />
            <button type="submit" className="btn btn-primary" disabled={uploadingImage}>
              {uploadingImage ? 'Загрузка...' : 'Отправить'}
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

