'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'

type ProfileMini = {
  id: string
  full_name: string
  avatar_url: string | null
  is_pro: boolean
}

type Message = {
  id: string
  content: string
  created_at: string
  expires_at: string
  sender_id: string
  reply_to_id?: string | null
  profiles: ProfileMini | ProfileMini[] | null
  reply?: {
    id: string
    content: string
    profiles: { full_name: string } | { full_name: string }[] | null
  } | null
}

type ChatMeta = {
  id: string
  name: string
  icon: string
  description?: string | null
  city?: string | null
  members_count?: number
}

const COLORS = ['#c0392b', '#555', '#1d5fa6', '#22a85e', '#6c3483', '#8B4513']

function asOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? v[0] ?? null : v
}

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  return headers
}

function getColor(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash += userId.charCodeAt(i)
  return COLORS[hash % COLORS.length]
}

function getInitials(name?: string) {
  if (!name) return '??'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

function formatCooldown(ms: number) {
  if (ms <= 0) return ''
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function GroupChatClient({ chatId }: { chatId: string }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const longPressTimer = useRef<number | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [chat, setChat] = useState<ChatMeta | null>(null)
  const [canWrite, setCanWrite] = useState(false)
  const [nextAvail, setNextAvail] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [expiresIn, setExpiresIn] = useState('')
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<Message | null>(null)
  const [error, setError] = useState('')

  const myId = user?.id || ''

  const load = useCallback(async () => {
    const res = await fetch(`/api/group-chats/${chatId}/messages`, { headers: await authHeaders() })
    if (res.status === 403) {
      setForbidden(true)
      setLoading(false)
      return
    }
    if (res.status === 401) {
      router.push('/auth/login')
      return
    }
    const data = await res.json()
    if (data.chat) setChat(data.chat)
    setMessages(data.messages ?? [])
    setCanWrite(Boolean(data.canWrite))
    setNextAvail(data.nextAvailable ? new Date(data.nextAvailable) : null)
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [chatId, router])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    void load()
  }, [user, authLoading, load, router])

  // Кулдаун-таймер
  useEffect(() => {
    if (!nextAvail) {
      setTimeLeft('')
      return
    }
    const tick = () => {
      const diff = nextAvail.getTime() - Date.now()
      if (diff <= 0) {
        setCanWrite(true)
        setTimeLeft('')
        setNextAvail(null)
        return
      }
      setTimeLeft(formatCooldown(diff))
    }
    tick()
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [nextAvail])

  // TTL ближайшего истечения
  useEffect(() => {
    if (!messages.length) {
      setExpiresIn('')
      return
    }
    const tick = () => {
      const soonest = messages.reduce((min, m) => {
        const t = new Date(m.expires_at).getTime()
        return t < min ? t : min
      }, Infinity)
      const diff = soonest - Date.now()
      if (diff <= 0) {
        setExpiresIn('обновляется')
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      setExpiresIn(`${h} ч ${m} м`)
    }
    tick()
    const t = window.setInterval(tick, 60_000)
    return () => window.clearInterval(t)
  }, [messages])

  // Realtime
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`group-chat-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `chat_id=eq.${chatId}` },
        () => {
          void load()
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'group_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const oldId = (payload.old as { id?: string })?.id
          if (oldId) setMessages((prev) => prev.filter((m) => m.id !== oldId))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [chatId, user, load])

  const sendMessage = async () => {
    if (!text.trim() || sending || !canWrite) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/group-chats/${chatId}/messages`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ content: text.trim(), reply_to_id: replyTo?.id }),
      })
      const data = await res.json()
      if (data.error === 'cooldown') {
        setCanWrite(false)
        setNextAvail(new Date(data.nextAvailable))
        setError('Подождите до следующего сообщения')
        return
      }
      if (!res.ok) {
        setError(data.error || 'Не удалось отправить')
        return
      }
      setText('')
      setReplyTo(null)
      setCanWrite(false)
      setNextAvail(data.nextAvailable ? new Date(data.nextAvailable) : new Date(Date.now() + 12 * 60 * 60 * 1000)) // 12ч кулдаун
      if (data.message) {
        setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]))
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      } else {
        await load()
      }
    } finally {
      setSending(false)
    }
  }

  const deleteMessage = async (msgId: string) => {
    await fetch(`/api/group-chats/${chatId}/messages/${msgId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    })
    setMessages((prev) => prev.filter((m) => m.id !== msgId))
    setCtxMenu(null)
  }

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const startLongPress = (msg: Message) => {
    clearLongPress()
    longPressTimer.current = window.setTimeout(() => setCtxMenu(msg), 450)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f2f2f7] max-w-lg mx-auto flex items-center justify-center">
        <span className="w-8 h-8 rounded-full border-2 border-[#d1d1d6] border-t-[#c0392b] animate-spin" />
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="min-h-[100dvh] bg-[#f2f2f7] max-w-lg mx-auto flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[16px] font-bold text-[#1c1c1e] mb-2">Только для PRO мастеров</p>
        <p className="text-[13px] text-[#8e8e93] mb-5">Профессиональные чаты доступны с активной подпиской PRO.</p>
        <Link href="/pro" className="bg-[#c0392b] text-white font-bold text-[14px] px-6 py-3 rounded-2xl">
          Получить PRO
        </Link>
        <Link href="/chats" className="mt-4 text-[13px] text-[#8e8e93]">
          ← Назад к чатам
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f2f2f7] max-w-lg mx-auto w-full">
      {/* Topbar */}
      <div className="bg-white border-b border-[#e5e5ea] px-3 py-2.5 flex items-center gap-2.5 flex-shrink-0 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => router.push('/chats')}
          className="w-8 h-8 rounded-lg bg-[#f2f2f7] flex items-center justify-center text-[#c0392b] text-base flex-shrink-0"
          aria-label="Назад"
        >
          ←
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c0392b] to-[#e74c3c] flex items-center justify-center text-xl flex-shrink-0">
          {chat?.icon ?? '💬'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[#1c1c1e] truncate">{chat?.name ?? 'Профчат'}</p>
          <p className="text-[10px] text-[#8e8e93]">
            Только PRO · сообщения {expiresIn ? `обновятся через ${expiresIn}` : 'живут 48 ч'}
          </p>
        </div>
      </div>

      {/* Rules */}
      <div className="bg-[#fff8e6] border-b border-[#ffe0a0] px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <span className="text-[13px]" aria-hidden>
          ⏱️
        </span>
        <span className="text-[10px] text-[#8a6000] leading-tight">
          PRO мастера · <strong>1 сообщение в 12 часов</strong> · Сообщения живут 48 ч
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">{chat?.icon ?? '💬'}</div>
            <p className="text-[14px] font-bold text-[#1c1c1e] mb-1">Начните общение</p>
            <p className="text-[12px] text-[#8e8e93]">Будьте первым, кто напишет в этот чат</p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === myId
          const profile = asOne(msg.profiles)
          const color = getColor(msg.sender_id)
          const reply = msg.reply
          const replyProfile = asOne(reply?.profiles)

          return (
            <div
              key={msg.id}
              className={`flex gap-2 max-w-[85%] ${isOwn ? 'ml-auto flex-row-reverse' : ''}`}
              onTouchStart={() => startLongPress(msg)}
              onTouchEnd={clearLongPress}
              onTouchMove={clearLongPress}
              onContextMenu={(e) => {
                e.preventDefault()
                setCtxMenu(msg)
              }}
            >
              {!isOwn && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 self-end overflow-hidden"
                  style={{ background: color }}
                >
                  {profile?.avatar_url ? (
                    <Image src={profile.avatar_url} alt="" width={28} height={28} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(profile?.full_name)
                  )}
                </div>
              )}

              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-bold" style={{ color }}>
                      {profile?.full_name || 'Мастер'}
                    </span>
                    {profile?.is_pro && (
                      <span className="text-[7px] font-bold bg-[#fff8e6] text-[#cc8800] px-1 py-0.5 rounded">PRO</span>
                    )}
                  </div>
                )}

                <div
                  className={`rounded-2xl px-3 py-2 ${
                    isOwn ? 'bg-[#c0392b] rounded-br-[4px]' : 'bg-white rounded-bl-[4px]'
                  }`}
                >
                  {reply && (
                    <div className={`rounded-lg px-2 py-1 mb-2 border-l-2 border-[#c0392b] ${isOwn ? 'bg-white/15' : 'bg-[#fdf0f0]'}`}>
                      <p className={`text-[9px] font-bold ${isOwn ? 'text-white/80' : 'text-[#c0392b]'}`}>
                        {replyProfile?.full_name || 'Мастер'}
                      </p>
                      <p className={`text-[11px] truncate ${isOwn ? 'text-white/70' : 'text-[#555]'}`}>{reply.content}</p>
                    </div>
                  )}
                  <p className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words ${isOwn ? 'text-white' : 'text-[#1c1c1e]'}`}>
                    {msg.content.split(/(@[\wА-Яа-яЁё.\- ]+)/g).map((part, i) =>
                      part.startsWith('@') ? (
                        <span key={i} className={isOwn ? 'font-bold text-white' : 'font-bold text-[#c0392b]'}>
                          {part}
                        </span>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </p>
                  <p className={`text-[9px] mt-1 text-right ${isOwn ? 'text-white/60' : 'text-[#bbb]'}`}>
                    {fmtTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div className="fixed inset-0 bg-black/30 z-[110] flex items-end" onClick={() => setCtxMenu(null)} role="presentation">
          <div
            className="w-full max-w-lg mx-auto bg-white rounded-t-2xl overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-10 bg-[#d1d1d6] rounded-full mx-auto my-2" />
            <div className="px-2 pb-2">
              <div className="text-[12px] font-bold text-[#8e8e93] px-3 py-2 uppercase tracking-wider">Действия</div>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#f5f5f7] text-[13px] text-[#1c1c1e]"
                onClick={() => {
                  setReplyTo(ctxMenu)
                  setCtxMenu(null)
                  inputRef.current?.focus()
                }}
              >
                <span>↩️</span>Ответить
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#f5f5f7] text-[13px] text-[#1c1c1e]"
                onClick={() => {
                  const name = asOne(ctxMenu.profiles)?.full_name || 'Мастер'
                  setText((t) => `@${name} ${t}`)
                  setCtxMenu(null)
                  inputRef.current?.focus()
                }}
              >
                <span>@</span>Упомянуть
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#f5f5f7] text-[13px] text-[#1c1c1e]"
                onClick={() => {
                  void navigator.clipboard?.writeText(ctxMenu.content)
                  setCtxMenu(null)
                }}
              >
                <span>📋</span>Скопировать
              </button>
              {asOne(ctxMenu.profiles)?.id && (
                <Link
                  href={`/profile/${asOne(ctxMenu.profiles)!.id}`}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#f5f5f7] text-[13px] text-[#1c1c1e]"
                  onClick={() => setCtxMenu(null)}
                >
                  <span>👤</span>Профиль мастера
                </Link>
              )}
              {ctxMenu.sender_id === myId && (
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-[13px] text-[#c0392b]"
                  onClick={() => void deleteMessage(ctxMenu.id)}
                >
                  <span>🗑️</span>Удалить сообщение
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="bg-white border-t border-[#e5e5ea] px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex-shrink-0">
        {error && <p className="text-[11px] text-[#c0392b] mb-2 px-1">{error}</p>}

        {!canWrite && nextAvail && (
          <div className="flex items-center gap-2 bg-[#fdf0f0] rounded-xl px-3 py-2 mb-2">
            <span className="text-[14px]">⏳</span>
            <span className="text-[11px] text-[#c0392b] font-semibold flex-1">Следующее сообщение через</span>
            <span className="text-[13px] font-mono font-bold text-[#c0392b]">{timeLeft || '…'}</span>
          </div>
        )}

        {replyTo && (
          <div className="flex items-center gap-2 bg-[#f9f9fb] border border-[#e5e5ea] rounded-xl px-3 py-2 mb-2">
            <div className="w-1 h-8 bg-[#c0392b] rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-[#c0392b]">{asOne(replyTo.profiles)?.full_name}</p>
              <p className="text-[11px] text-[#8e8e93] truncate">{replyTo.content}</p>
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="text-[#bbb] text-sm px-1" aria-label="Отменить ответ">
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!canWrite}
            placeholder={canWrite ? 'Написать в чат...' : 'Подождите...'}
            rows={1}
            maxLength={2000}
            className={`flex-1 bg-[#f2f2f7] border border-[#e5e5ea] rounded-2xl px-3 py-2.5 text-[13px] text-[#1c1c1e] outline-none resize-none min-h-[38px] max-h-[100px] ${
              !canWrite ? 'opacity-40' : ''
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!canWrite || !text.trim() || sending}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
              canWrite && text.trim() ? 'bg-[#c0392b]' : 'bg-[#c7c7cc]'
            }`}
            aria-label="Отправить"
          >
            {sending ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '➤'}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1.5 px-1">
          <span className="text-[9px] bg-[#fff8e6] text-[#cc8800] px-1.5 py-0.5 rounded font-bold">PRO</span>
          <span className="text-[10px] text-[#8e8e93]">1 сообщение в 12 часов · живут 48 ч</span>
        </div>
      </div>
    </div>
  )
}
