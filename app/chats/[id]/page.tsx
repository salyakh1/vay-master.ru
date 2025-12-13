'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase, Message, User } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [messages, setMessages] = useState<(Message & { sender: User })[]>([])
  const [otherUser, setOtherUser] = useState<User | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !params.id) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: params.id as string,
          sender_id: user.id,
          content: newMessage.trim(),
        })

      if (error) throw error

      // Update chat updated_at
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', params.id)

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
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
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <Navbar />
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black border border-gray-200 flex items-center justify-center text-white text-sm font-bold">
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
              <div className="font-semibold">{otherUser.full_name}</div>
              <div className="text-sm text-gray-500">{otherUser.city || ''}</div>
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
                  className={`max-w-xs lg:max-w-md px-4 py-3 border transition-colors ${
                    isOwn
                      ? 'bg-black text-white border-black'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  {!isOwn && (
                    <div className="text-xs font-semibold mb-1 text-gray-600">
                      {message.sender.full_name}
                    </div>
                  )}
                  <div>{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-blue-100' : 'text-gray-400'
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
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Написать сообщение..."
              className="flex-1 input"
            />
            <button type="submit" className="btn btn-primary">
              Отправить
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

