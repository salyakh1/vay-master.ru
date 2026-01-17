'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/app/providers'
import { supabase, User } from '@/lib/supabase'
import { getAdminRole, logAdminAction, type AdminRole } from '@/lib/admin'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiSearch, FiZap, FiXCircle, FiCheckCircle, FiToggleLeft, FiToggleRight } from 'react-icons/fi'

type RoleFilter = '' | 'master' | 'seller'

function isProActive(u: User): boolean {
  if ((u as any).is_pro === true) return true
  const until = (u as any).pro_until ? new Date((u as any).pro_until) : null
  return !!until && !Number.isNaN(until.getTime()) && until.getTime() > Date.now()
}

function trialEndsAt(u: User): Date | null {
  if (u.role !== 'master' && u.role !== 'seller') return null
  const startRaw = (u as any).pro_trial_started_at || u.created_at
  const start = new Date(startRaw)
  if (Number.isNaN(start.getTime())) return null
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
}

export default function AdminSubscriptionsPage() {
  const { user: currentUser } = useAuth()
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('')
  const [onlyWithPro, setOnlyWithPro] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [flagsLoading, setFlagsLoading] = useState(false)
  const [disableMasterRestrictions, setDisableMasterRestrictions] = useState(false)
  const [disableSellerRestrictions, setDisableSellerRestrictions] = useState(false)

  useEffect(() => {
    if (currentUser) {
      getAdminRole(currentUser.id).then(setAdminRole)
    }
  }, [currentUser])

  useEffect(() => {
    fetchUsers()
    fetchFlags()
    if (currentUser) {
      logAdminAction(currentUser.id, 'view_subscriptions', 'subscriptions')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, roleFilter, onlyWithPro])

  const fetchFlags = async () => {
    try {
      setFlagsLoading(true)
      const res = await fetch('/api/pro/settings')
      const data = await res.json()
      setDisableMasterRestrictions(!!data?.disableMasterRestrictions)
      setDisableSellerRestrictions(!!data?.disableSellerRestrictions)
    } catch (e) {
      console.error('Error fetching flags:', e)
    } finally {
      setFlagsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('profiles')
        .select('*')
        .in('role', ['master', 'seller'])
        .order('created_at', { ascending: false })
        .limit(200)

      if (roleFilter) query = query.eq('role', roleFilter)
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error

      let list = (data || []) as User[]
      if (onlyWithPro) {
        list = list.filter((u) => isProActive(u) || !!(u as any).pro_until)
      }
      setUsers(list)
    } catch (e) {
      console.error('Error fetching users:', e)
    } finally {
      setLoading(false)
    }
  }

  const sessionToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  }

  const callAdminApi = async (path: string, body: any) => {
    const token = await sessionToken()
    if (!token) throw new Error('Сессия не найдена')
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Ошибка запроса')
    return data
  }

  const grantPro = async (userId: string, days: number) => {
    setMutating(true)
    try {
      await callAdminApi('/api/admin/subscriptions/grant', { userId, days })
      await fetchUsers()
    } finally {
      setMutating(false)
    }
  }

  const revokePro = async (userId: string) => {
    const ok = window.confirm('Снять PRO у пользователя?')
    if (!ok) return
    setMutating(true)
    try {
      await callAdminApi('/api/admin/subscriptions/revoke', { userId })
      await fetchUsers()
    } finally {
      setMutating(false)
    }
  }

  const bulkGrantMonth = async (role: 'master' | 'seller' | 'both') => {
    const ok = window.confirm(`Выдать PRO на 30 дней всем (${role})?`)
    if (!ok) return
    setMutating(true)
    try {
      await callAdminApi('/api/admin/subscriptions/bulk', { action: 'grant', role, days: 30 })
      await fetchUsers()
    } finally {
      setMutating(false)
    }
  }

  const bulkRevokeAll = async (role: 'master' | 'seller' | 'both') => {
    const ok = window.confirm(`СНЯТЬ PRO у всех (${role})? Это действие массовое.`)
    if (!ok) return
    setMutating(true)
    try {
      await callAdminApi('/api/admin/subscriptions/bulk', { action: 'revoke', role })
      await fetchUsers()
    } finally {
      setMutating(false)
    }
  }

  const saveFlags = async (nextMaster: boolean, nextSeller: boolean) => {
    setMutating(true)
    try {
      await callAdminApi('/api/admin/subscriptions/flags', {
        disableMasterRestrictions: nextMaster,
        disableSellerRestrictions: nextSeller,
      })
      setDisableMasterRestrictions(nextMaster)
      setDisableSellerRestrictions(nextSeller)
      await fetchFlags()
    } finally {
      setMutating(false)
    }
  }

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    const q = searchQuery.toLowerCase()
    return users.filter((u) =>
      [u.full_name, u.email, u.phone, u.city].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    )
  }, [users, searchQuery])

  if (!currentUser || adminRole !== 'super_admin') {
    return (
      <div className="card">
        <div className="text-text-secondary">Только супер-администратор видит управление подписками.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Подписки / PRO</h1>
        <p className="text-text-secondary">
          Управление PRO статусом, бесплатным месяцем и отключением ограничений “одним кликом”.
        </p>
      </div>

      {/* Feature flags */}
      <div className="card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold text-text-primary flex items-center gap-2">
              <FiZap /> Отключение ограничений (глобально)
            </div>
            <div className="text-sm text-text-secondary">
              Если включено — платный режим/ограничения не применяются (как будто PRO у всех).
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              className={`btn ${disableMasterRestrictions ? 'btn-primary' : 'btn-outline'} flex items-center gap-2`}
              disabled={mutating || flagsLoading}
              onClick={() => saveFlags(!disableMasterRestrictions, disableSellerRestrictions)}
            >
              {disableMasterRestrictions ? <FiToggleRight /> : <FiToggleLeft />}
              Мастера
            </button>
            <button
              className={`btn ${disableSellerRestrictions ? 'btn-primary' : 'btn-outline'} flex items-center gap-2`}
              disabled={mutating || flagsLoading}
              onClick={() => saveFlags(disableMasterRestrictions, !disableSellerRestrictions)}
            >
              {disableSellerRestrictions ? <FiToggleRight /> : <FiToggleLeft />}
              Продавцы
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="card">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold text-text-primary">Массовые действия</div>
            <div className="text-sm text-text-secondary">Осторожно: действует на всех выбранных пользователей.</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-primary" disabled={mutating} onClick={() => bulkGrantMonth('both')}>
              Бесплатный месяц всем (master + seller)
            </button>
            <button className="btn btn-outline" disabled={mutating} onClick={() => bulkGrantMonth('master')}>
              +30 дней мастерам
            </button>
            <button className="btn btn-outline" disabled={mutating} onClick={() => bulkGrantMonth('seller')}>
              +30 дней продавцам
            </button>
            <button className="btn btn-outline" disabled={mutating} onClick={() => bulkRevokeAll('both')}>
              Снять PRO у всех
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск: имя, email, телефон..."
              className="input pl-10 w-full h-10 text-sm"
            />
          </div>

          <div className={`relative select-wrapper w-full ${roleFilter ? 'has-value' : ''}`} data-placeholder="Роль">
            <select 
              className="input w-full h-10 text-sm appearance-none cursor-pointer" 
              value={roleFilter || ''} 
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              style={{
                color: !roleFilter ? 'transparent' : 'var(--text-primary)',
              }}
            >
              <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                Роль
              </option>
              <option value="master">Мастера</option>
              <option value="seller">Продавцы</option>
            </select>
          </div>

          <button
            className={`btn h-10 w-full text-sm ${onlyWithPro ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setOnlyWithPro((v) => !v)}
          >
            Только с PRO
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card text-text-secondary">Загрузка...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="card text-text-secondary">Пользователи не найдены</div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => {
            const proActive = isProActive(u)
            const until = (u as any).pro_until ? new Date((u as any).pro_until) : null
            const trialEnd = trialEndsAt(u)
            const trialActive = trialEnd ? trialEnd.getTime() > Date.now() : false

            return (
              <div key={u.id} className="bg-bg-card rounded-lg border border-border-light/60 p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-[220px]">
                    <div className="font-semibold text-graphite-secondary">{u.full_name}</div>
                    <div className="text-sm text-text-secondary">{u.email}</div>
                    <div className="text-xs text-text-muted mt-1">
                      {u.role} · Регистрация: {format(new Date(u.created_at), 'd MMMM yyyy', { locale: ru })}
                    </div>
                  </div>

                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      {proActive ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-green-100 text-green-700 border border-green-300 text-sm font-semibold">
                          <FiCheckCircle /> PRO активен
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-bg-secondary text-text-secondary border border-border-light/60 text-sm font-semibold">
                          <FiXCircle /> PRO не активен
                        </span>
                      )}

                      {until && !Number.isNaN(until.getTime()) && (
                        <span className="text-sm text-text-secondary">
                          до {format(until, 'd MMMM yyyy, HH:mm', { locale: ru })}
                        </span>
                      )}
                    </div>

                    {u.role === 'master' && (
                      <div className="mt-2 text-sm text-text-secondary">
                        Бесплатный период: {trialActive ? 'активен' : 'завершён'}{' '}
                        {trialEnd ? `· до ${format(trialEnd, 'd MMMM yyyy, HH:mm', { locale: ru })}` : ''}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button className="btn btn-outline" disabled={mutating} onClick={() => grantPro(u.id, 7)}>
                      +7д
                    </button>
                    <button className="btn btn-outline" disabled={mutating} onClick={() => grantPro(u.id, 30)}>
                      +30д
                    </button>
                    <button className="btn btn-outline" disabled={mutating} onClick={() => grantPro(u.id, 90)}>
                      +90д
                    </button>
                    <button className="btn btn-outline" disabled={mutating} onClick={() => grantPro(u.id, 365)}>
                      +1г
                    </button>
                    <button className="btn btn-outline" disabled={mutating} onClick={() => revokePro(u.id)}>
                      Снять PRO
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

