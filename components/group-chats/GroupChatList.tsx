'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { isProActive } from '@/lib/masterAccess'

export type GroupChatRowData = {
  id: string
  name: string
  icon: string
  description?: string | null
  canWrite: boolean
  nextAvailable: string | null
  lastMessageAt: string | null
  lastPreview?: { content: string; senderName: string; created_at: string } | null
  members_count?: number
}

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  return headers
}

function formatRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'сейчас'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} мин`
  if (diff < 86_400_000) {
    return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
  }
  return 'вчера'
}

export default function GroupChatList() {
  const { user } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<GroupChatRowData[]>([])
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(true)

  // Не мастера — не показываем блок
  const isMaster = user?.role === 'master'

  useEffect(() => {
    if (!user || !isMaster) {
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/group-chats', { headers: await authHeaders() })
        const data = await res.json()
        if (cancelled) return
        setIsPro(Boolean(data.isPro))
        setChats(data.chats ?? [])
      } catch {
        if (!cancelled) {
          setIsPro(isProActive(user))
          setChats([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, isMaster])

  if (!isMaster) return null

  if (loading) {
    return (
      <div className="bg-white">
        <div className="px-4 pt-2.5 pb-1">
          <p className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider">Профессиональные</p>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 items-center px-4 py-3 border-b border-[#f5f5f7] animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-[#f0f0f0] flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3.5 w-32 bg-[#f0f0f0] rounded mb-2" />
              <div className="h-3 w-48 bg-[#f0f0f0] rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!isPro) {
    return (
      <div className="mx-4 my-3 bg-[#fff8e6] border border-[#ffe0a0] rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c0392b] to-[#e74c3c] text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
            PRO
          </span>
          <div>
            <p className="text-[13px] font-bold text-[#1c1c1e]">Профессиональные чаты</p>
            <p className="text-[11px] text-[#8e8e93]">Только для PRO мастеров</p>
          </div>
        </div>
        <p className="text-[11px] text-[#555] mb-3 leading-relaxed">
          Общайтесь с коллегами по специализации, делитесь опытом, берите субподряды. 1 сообщение в 12 часов.
          Сообщения живут 72 часа.
        </p>
        <button
          type="button"
          onClick={() => router.push('/pro')}
          className="w-full bg-[#c0392b] text-white text-[12px] font-bold py-2.5 rounded-xl active:scale-[0.98]"
        >
          Получить PRO →
        </button>
      </div>
    )
  }

  if (chats.length === 0) return null

  return (
    <div className="bg-white">
      <div className="px-4 pt-2.5 pb-1">
        <p className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider">Профессиональные</p>
      </div>
      {chats.map((chat) => (
        <GroupChatRow key={chat.id} chat={chat} onClick={() => router.push(`/chats/group/${chat.id}`)} />
      ))}
      <div className="px-4 pt-2 pb-1 bg-[#f5f5f7]">
        <p className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider">Личные</p>
      </div>
    </div>
  )
}

function GroupChatRow({ chat, onClick }: { chat: GroupChatRowData; onClick: () => void }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (chat.canWrite || !chat.nextAvailable) {
      setTimeLeft('')
      return
    }
    const tick = () => {
      const diff = new Date(chat.nextAvailable!).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('')
        return
      }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1000)
      setTimeLeft(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [chat.canWrite, chat.nextAvailable])

  const preview = chat.lastPreview

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#f5f5f7] active:bg-[#f9f9f9] text-left"
    >
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c0392b] to-[#e74c3c] flex items-center justify-center text-2xl flex-shrink-0">
        {chat.icon || '💬'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-bold text-[#1c1c1e] truncate">{chat.name}</span>
          <span className="text-[8px] font-bold bg-[#fdf0f0] text-[#c0392b] px-1.5 py-0.5 rounded flex-shrink-0">
            ПРОФ
          </span>
        </div>
        {preview ? (
          <p className="text-[12px] text-[#8e8e93] truncate">
            <strong className="text-[#1c1c1e] font-semibold">{preview.senderName}:</strong> {preview.content}
          </p>
        ) : chat.canWrite ? (
          <p className="text-[11px] text-[#22a85e] font-semibold">Можно написать</p>
        ) : (
          <p className="text-[11px] text-[#8e8e93]">
            Следующее через <span className="font-mono text-[#c0392b] font-bold">{timeLeft || '…'}</span>
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {preview?.created_at && <span className="text-[10px] text-[#c7c7cc]">{formatRelTime(preview.created_at)}</span>}
        {!chat.canWrite && timeLeft && !preview && (
          <span className="text-[10px] font-mono text-[#c0392b]">{timeLeft}</span>
        )}
        <span className="text-[#c7c7cc] text-lg leading-none">›</span>
      </div>
    </button>
  )
}
