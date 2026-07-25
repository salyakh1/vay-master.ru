'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiX, FiSend, FiExternalLink } from 'react-icons/fi'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import {
  buildProductInterestMessage,
  findOrCreateChat,
  hasProductContextMessage,
} from '@/lib/chatHelpers'

type ProductChatProduct = {
  id: string
  name: string
  price: number
  images?: string[] | null
}

type ProductChatSeller = {
  id: string
  full_name?: string | null
  avatar_url?: string | null
}

type ChatMessage = {
  id: string
  chat_id: string
  sender_id: string
  content: string
  image_url?: string | null
  created_at: string
  read?: boolean
}

type ProductChatModalProps = {
  isOpen: boolean
  onClose: () => void
  product: ProductChatProduct
  seller: ProductChatSeller
}

export default function ProductChatModal({ isOpen, onClose, product, seller }: ProductChatModalProps) {
  const { user } = useAuth()
  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const contextSentRef = useRef(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const cover = product.images?.[0] || null
  const sellerName = seller.full_name || 'Продавец'

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  const notifyChat = useCallback(async (id: string) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      if (!token) return
      void fetch(`/api/chats/${id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    } catch {
      /* ignore */
    }
  }, [])

  const insertMessage = useCallback(
    async (id: string, content: string, imageUrl?: string | null) => {
      if (!user) return null
      const insertData: Record<string, unknown> = {
        chat_id: id,
        sender_id: user.id,
        content: content || '',
      }
      if (imageUrl) insertData.image_url = imageUrl

      const { data, error: insertError } = await supabase
        .from('messages')
        .insert(insertData)
        .select('id, chat_id, sender_id, content, image_url, created_at, read')
        .single()

      if (insertError) throw insertError

      await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', id)
      void notifyChat(id)
      return data as ChatMessage
    },
    [user, notifyChat]
  )

  const loadMessages = useCallback(async (id: string) => {
    const { data, error: loadError } = await supabase
      .from('messages')
      .select('id, chat_id, sender_id, content, image_url, created_at, read')
      .eq('chat_id', id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (loadError) throw loadError
    return (data || []) as ChatMessage[]
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !user) return

    let cancelled = false
    contextSentRef.current = false
    setLoading(true)
    setError(null)
    setChatId(null)
    setMessages([])
    setNewMessage('')

    const productId = product.id
    const productName = product.name
    const productPrice = product.price
    const productCover = product.images?.[0] || null

    ;(async () => {
      try {
        const id = await findOrCreateChat(user.id, seller.id)
        if (cancelled) return
        setChatId(id)

        let list = await loadMessages(id)
        if (cancelled) return

        if (!hasProductContextMessage(list, productId) && !contextSentRef.current) {
          contextSentRef.current = true
          const text = buildProductInterestMessage({
            id: productId,
            name: productName,
            price: productPrice,
          })
          const created = await insertMessage(id, text, productCover)
          if (created && !cancelled) {
            list = [...list, created]
          }
        }

        if (!cancelled) {
          setMessages(list)
          setLoading(false)
          scrollToBottom()
        }
      } catch (e) {
        console.error('ProductChatModal init:', e)
        if (!cancelled) {
          setError('Не удалось открыть чат')
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    isOpen,
    user,
    seller.id,
    product.id,
    product.name,
    product.price,
    product.images,
    loadMessages,
    insertMessage,
    scrollToBottom,
  ])

  useEffect(() => {
    if (!isOpen || !chatId) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`product-chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const row = payload.new as ChatMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev
            return [...prev, row]
          })
          scrollToBottom()
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [isOpen, chatId, scrollToBottom])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = newMessage.trim()
    if (!text || !chatId || !user || sending) return

    setSending(true)
    const tempId = `temp-${Date.now()}`
    const optimistic: ChatMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
      read: false,
    }
    setMessages((prev) => [...prev, optimistic])
    setNewMessage('')
    scrollToBottom()

    try {
      const created = await insertMessage(chatId, text)
      if (created) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? created : m)))
      }
    } catch (err) {
      console.error('ProductChatModal send:', err)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setNewMessage(text)
      setError('Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-lg h-[min(88vh,640px)] bg-white rounded-t-2xl flex flex-col animate-slide-up shadow-xl">
        <div className="w-9 h-1 bg-[#e5e5ea] rounded-full mx-auto mt-2 mb-1 flex-shrink-0" />

        {/* Шапка: товар */}
        <div className="flex items-start gap-2.5 px-3.5 pb-2.5 border-b border-[#f0f0f0] flex-shrink-0">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#f5f5f7] flex-shrink-0">
            {cover ? (
              <Image src={cover} alt="" fill className="object-cover" sizes="48px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[16px]">📦</div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[12px] font-bold text-[#111] leading-snug line-clamp-2">{product.name}</p>
            <p className="text-[12px] font-bold text-[#e63946] mt-0.5">
              {Number(product.price || 0).toLocaleString('ru-RU')} ₽
            </p>
            <p className="text-[10px] text-[#888] truncate mt-0.5">Чат с {sellerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 text-[#888] flex-shrink-0"
          >
            <FiX size={20} />
          </button>
        </div>

        {chatId && (
          <div className="px-3.5 py-1.5 border-b border-[#f5f5f7] flex-shrink-0">
            <Link
              href={`/chats/${chatId}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#e63946]"
            >
              Открыть в полном чате
              <FiExternalLink size={12} />
            </Link>
          </div>
        )}

        {/* Сообщения */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-3.5 py-3 bg-[#f5f5f7] space-y-2">
          {loading ? (
            <p className="text-center text-[12px] text-[#888] py-8">Загрузка чата…</p>
          ) : error ? (
            <p className="text-center text-[12px] text-[#e63946] py-8">{error}</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-[12px] text-[#888] py-8">Напишите продавцу о товаре</p>
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_id === user?.id
              return (
                <div
                  key={message.id}
                  className={`flex flex-col max-w-[82%] ${isOwn ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  {message.image_url && (
                    <div className="relative w-[120px] h-[88px] rounded-xl overflow-hidden mb-1 bg-[#eee]">
                      <Image
                        src={message.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    </div>
                  )}
                  {message.content?.trim() && (
                    <div
                      className={`px-3 py-2 text-[12px] leading-relaxed rounded-2xl whitespace-pre-wrap break-words ${
                        isOwn
                          ? 'bg-[#e63946] text-white rounded-br-md'
                          : 'bg-white text-[#111] border border-[#f0f0f0] rounded-bl-md'
                      }`}
                    >
                      {message.content}
                    </div>
                  )}
                  <span className="text-[9px] text-[#bbb] mt-0.5 px-0.5">
                    {format(new Date(message.created_at), 'HH:mm', { locale: ru })}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Инпут */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 px-3.5 py-2.5 border-t border-[#f0f0f0] bg-white flex-shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Сообщение…"
            disabled={!chatId || loading || sending}
            className="flex-1 min-w-0 bg-[#f5f5f7] border border-[#ececec] rounded-xl px-3 py-2.5 text-[13px] text-[#111] outline-none placeholder:text-[#bbb]"
          />
          <button
            type="submit"
            disabled={!chatId || loading || sending || !newMessage.trim()}
            className="w-10 h-10 rounded-xl bg-[#e63946] text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            aria-label="Отправить"
          >
            <FiSend size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
