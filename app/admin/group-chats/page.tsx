'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import { FiCheck, FiAlertTriangle, FiMinusCircle, FiRefreshCw } from 'react-icons/fi'

type CoverageRow = {
  categoryId: string
  categoryName: string
  categorySlug: string
  sortOrder: number
  subcategoryCount: number
  chatId: string | null
  chatName: string | null
  chatActive: boolean
  status: 'ok' | 'inactive' | 'missing'
}

type Summary = {
  categoriesTotal: number
  chatsLinked: number
  missing: number
  inactive: number
}

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  return headers
}

export default function AdminGroupChatsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<CoverageRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [needsMigration, setNeedsMigration] = useState(false)
  const [syncResult, setSyncResult] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/group-chats', { headers: await authHeaders() })
      const data = await res.json()
      if (!res.ok && !data.summary) {
        setError(data.error || 'Ошибка загрузки')
        return
      }
      setNeedsMigration(Boolean(data.needsMigration))
      setSummary(data.summary || null)
      setRows(data.rows || [])
      if (data.needsMigration) setError('Таблицы профчатов ещё не созданы. Выполните SQL в Supabase.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  const sync = async () => {
    setSyncing(true)
    setSyncResult('')
    setError('')
    try {
      const res = await fetch('/api/admin/group-chats', {
        method: 'POST',
        headers: await authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Не удалось синхронизировать')
        return
      }
      setSyncResult(
        `Создано: ${data.created}, активировано: ${data.activated}` +
          (data.errors?.length ? `, ошибок: ${data.errors.length}` : '')
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSyncing(false)
    }
  }

  const statusBadge = (status: CoverageRow['status']) => {
    if (status === 'ok')
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#22a85e] bg-[#edfff5] px-2 py-0.5 rounded-lg">
          <FiCheck size={12} /> Есть чат
        </span>
      )
    if (status === 'inactive')
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#cc8800] bg-[#fff8e6] px-2 py-0.5 rounded-lg">
          <FiMinusCircle size={12} /> Выключен
        </span>
      )
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#c0392b] bg-[#fdf0f0] px-2 py-0.5 rounded-lg">
        <FiAlertTriangle size={12} /> Нет чата
      </span>
    )
  }

  if (!user) return null

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-[20px] font-extrabold text-[#1c1c1e]">Профчаты · покрытие</h1>
          <p className="text-[13px] text-[#6e6e73] mt-1">
            У каждой категории мастеров должен быть свой профчат. Сообщения очищаются через 48 часов.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={syncing || needsMigration}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#c0392b] text-white text-[13px] font-bold disabled:opacity-50"
        >
          <FiRefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Синхронизация…' : 'Создать недостающие'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-[#fdf0f0] border border-[#f5c6cb] text-[#c0392b] px-4 py-3 text-[13px]">
          {error}
          {needsMigration && (
            <p className="mt-2 text-[12px] text-[#8a6000] bg-[#fff8e6] border border-[#ffe0a0] rounded-lg px-3 py-2">
              SQL: <code>supabase/group_chats.sql</code>, затем <code>supabase/group_chats_48h_coverage.sql</code>
            </p>
          )}
        </div>
      )}

      {syncResult && (
        <div className="mb-4 rounded-xl bg-[#edfff5] border border-[#b8efd0] text-[#1f9d55] px-4 py-3 text-[13px] font-semibold">
          {syncResult}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Категорий', value: summary.categoriesTotal, tone: 'text-[#1c1c1e]' },
            { label: 'С чатом', value: summary.chatsLinked, tone: 'text-[#22a85e]' },
            { label: 'Нет чата', value: summary.missing, tone: 'text-[#c0392b]' },
            { label: 'Выключены', value: summary.inactive, tone: 'text-[#cc8800]' },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl bg-white border border-[#e5e5ea] p-4">
              <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide">{card.label}</p>
              <p className={`text-[28px] font-extrabold mt-1 tabular-nums ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-white border border-[#e5e5ea] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#f0f0f0] flex items-center justify-between">
          <p className="text-[13px] font-bold text-[#1c1c1e]">Все профессии платформы</p>
          <button type="button" onClick={() => void load()} className="text-[12px] font-semibold text-[#c0392b]">
            Обновить
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[13px] text-[#8e8e93]">Загрузка…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[#8e8e93]">Нет категорий или таблицы не созданы</div>
        ) : (
          <div className="divide-y divide-[#f5f5f7]">
            {rows.map((row) => (
              <div key={row.categoryId} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#1c1c1e] truncate">{row.categoryName}</p>
                  <p className="text-[11px] text-[#8e8e93] truncate">
                    {row.categorySlug} · {row.subcategoryCount} подкатегорий
                    {row.chatName ? ` · чат: ${row.chatName}` : ''}
                  </p>
                </div>
                {statusBadge(row.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-[12px] text-[#8e8e93] leading-relaxed">
        Правило: 1 категория = 1 активный профчат. PRO-мастер видит до 3 чатов по своим специализациям. Сообщения
        автоматически скрываются через 48 часов.
      </p>
    </div>
  )
}
