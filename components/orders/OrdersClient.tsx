'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { supabase, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import OrderGridCard from './OrderGridCard'
import { getCategoryIcon, countByStatus } from './order-utils'
import { getMasterAccess } from '@/lib/masterAccess'
import { getProFeatureFlags, restrictionsDisabledForRole } from '@/lib/proSettings'

const ORDER_FRESH_DAYS_MS = 60 * 24 * 60 * 60 * 1000
const ORDER_EARLY_ACCESS_MS = 24 * 60 * 60 * 1000

const CLIENT_TABS = [
  { key: 'all', label: 'Все' },
  { key: 'new', label: 'Новые' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'completed', label: 'Готово' },
] as const

const MASTER_TABS = [
  { key: 'available', label: 'Доступные' },
  { key: 'my_response', label: 'Мои отклики' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'mine', label: 'Мои заказы' },
] as const

const ITEMS_PER_PAGE = 20

function OrdersEmptyState({
  role,
  activeTab,
}: {
  role?: string
  activeTab: string
}) {
  const isAuthorEmpty =
    role === 'client' || role === 'seller' || activeTab === 'mine'

  let config: { icon: string; title: string; desc: string; btnText: string; btnHref: string }

  if (isAuthorEmpty) {
    config = {
      icon: '📋',
      title: 'Нет заказов',
      desc: 'Создайте заказ — мастера откликнутся с предложениями',
      btnText: 'Создать заказ',
      btnHref: '/orders/new',
    }
  } else if (activeTab === 'my_response') {
    config = {
      icon: '🔍',
      title: 'Вы ещё не откликались',
      desc: 'Найдите заказ и откликнитесь — клиент выберет вас',
      btnText: 'Смотреть заказы',
      btnHref: '/orders',
    }
  } else if (activeTab === 'in_progress') {
    config = {
      icon: '🛠',
      title: 'Нет заказов в работе',
      desc: 'Когда вас выберут — заказ появится здесь',
      btnText: 'Смотреть доступные',
      btnHref: '/orders',
    }
  } else {
    config = {
      icon: '🔍',
      title: 'Нет доступных заказов',
      desc: 'Новые заказы появляются каждый день. Или создайте свой.',
      btnText: 'Создать заказ',
      btnHref: '/orders/new',
    }
  }

  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <span className="text-5xl mb-4">{config.icon}</span>
      <p className="text-[15px] font-bold text-[#111] mb-2">{config.title}</p>
      <p className="text-[12px] text-[#aaa] leading-relaxed mb-6">{config.desc}</p>
      <Link href={config.btnHref} className="bg-[#e63946] text-white text-[13px] font-bold px-6 py-3 rounded-2xl">
        {config.btnText}
      </Link>
    </div>
  )
}

export default function OrdersClient() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [statsSource, setStatsSource] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({})
  const [myResponsesCount, setMyResponsesCount] = useState(0)
  const [availableCount, setAvailableCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'my_specializations'>('all')
  const [mySpecializations, setMySpecializations] = useState<string[]>([])
  /** null = ещё считаем PRO/trial флаги для мастера */
  const [hasEarlyAccess, setHasEarlyAccess] = useState<boolean | null>(null)
  const [hiddenFreshCount, setHiddenFreshCount] = useState(0)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const isMaster = user?.role === 'master'
  /** Клиент и продавец управляют своими заказами; мастер — ещё и лентой доступных */
  const isOwnerUi = user?.role === 'client' || user?.role === 'seller'
  const tabs = isMaster ? MASTER_TABS : CLIENT_TABS

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) {
      setHasEarlyAccess(null)
      setHiddenFreshCount(0)
      return
    }
    if (user.role !== 'master') {
      setHasEarlyAccess(true)
      setHiddenFreshCount(0)
      return
    }

    let cancelled = false
    setHasEarlyAccess(null)
    ;(async () => {
      const access = getMasterAccess(user)
      const flags = await getProFeatureFlags()
      const restrictionsDisabled = restrictionsDisabledForRole(user.role, flags)
      if (!cancelled) {
        setHasEarlyAccess(restrictionsDisabled || access.isPro || access.isTrial)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    if (user.role === 'master') {
      setActiveTab('available')
      supabase
        .from('profile_subcategories')
        .select('subcategory:subcategories(category:categories(name))')
        .eq('profile_id', user.id)
        .then(({ data }) => {
          const names = (data || [])
            .map((item) => (item as { subcategory?: { category?: { name?: string } } }).subcategory?.category?.name)
            .filter((n): n is string => !!n)
          setMySpecializations(Array.from(new Set(names)))
        })
      fetch('/api/notifications/count')
        .then((r) => r.json())
        .then((d) => setNotificationCount(d?.count ?? 0))
        .catch(() => {})
    } else {
      setActiveTab('all')
    }
  }, [user])

  const loadStats = useCallback(async () => {
    if (!user) return
    if (isOwnerUi) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
      setStatsSource((data || []) as Order[])
      return
    }

    // Ждём расчёт early access для мастеров, чтобы бейдж совпадал со списком
    if (user.role === 'master' && hasEarlyAccess === null) return

    const freshSince = new Date(Date.now() - ORDER_FRESH_DAYS_MS).toISOString()
    const visibleAfter = new Date(Date.now() - ORDER_EARLY_ACCESS_MS).toISOString()
    const delayFreshOrders = user.role === 'master' && hasEarlyAccess === false

    let availQuery = supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'new'])
      .neq('client_id', user.id)
      .gte('created_at', freshSince)

    if (delayFreshOrders) {
      availQuery = availQuery.lte('created_at', visibleAfter)
    }

    const [{ count: avail }, { count: resp }] = await Promise.all([
      availQuery,
      supabase
        .from('order_responses')
        .select('*', { count: 'exact', head: true })
        .eq('master_id', user.id),
    ])
    setAvailableCount(avail ?? 0)
    setMyResponsesCount(resp ?? 0)

    if (delayFreshOrders) {
      const { count: totalFresh } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'new'])
        .neq('client_id', user.id)
        .gte('created_at', freshSince)
      setHiddenFreshCount(Math.max(0, (totalFresh ?? 0) - (avail ?? 0)))
    } else {
      setHiddenFreshCount(0)
    }

    const { data: inProg } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'in_progress')
      .eq('selected_master_id', user.id)
    setStatsSource((inProg || []) as Order[])
  }, [user, isOwnerUi, hasEarlyAccess])

  const fetchOrders = useCallback(
    async (pageNum: number, reset: boolean) => {
      if (!user) return
      if (user.role === 'master' && hasEarlyAccess === null) return
      if (reset) setLoading(true)
      else setLoadingMore(true)

      try {
        const from = (pageNum - 1) * ITEMS_PER_PAGE
        const to = from + ITEMS_PER_PAGE - 1

        const loadOwnOrders = async (statusFilter?: string) => {
          let query = supabase
            .from('orders')
            .select(`*, client:profiles!client_id(id, full_name, avatar_url)`, { count: 'exact' })
            .eq('client_id', user.id)
            .order('created_at', { ascending: false })
            .range(from, to)

          if (statusFilter === 'new') query = query.in('status', ['open', 'new'])
          else if (statusFilter && statusFilter !== 'all' && statusFilter !== 'mine') {
            query = query.eq('status', statusFilter)
          }

          const { data, error, count } = await query
          if (error) throw error
          const list = (data || []) as Order[]
          setOrders((prev) => (reset ? list : [...prev, ...list]))
          setHasMore(list.length === ITEMS_PER_PAGE && (count ?? 0) > pageNum * ITEMS_PER_PAGE)

          if (reset && list.length) {
            const ids = list.map((o) => o.id)
            const { data: responses } = await supabase
              .from('order_responses')
              .select('order_id')
              .in('order_id', ids)
              .eq('status', 'pending')
            const counts: Record<string, number> = {}
            responses?.forEach((r) => {
              counts[r.order_id] = (counts[r.order_id] ?? 0) + 1
            })
            setResponseCounts((prev) => (reset ? counts : { ...prev, ...counts }))
          }
        }

        if (isOwnerUi) {
          await loadOwnOrders(activeTab)
        } else if (activeTab === 'mine') {
          await loadOwnOrders('all')
        } else if (activeTab === 'available') {
          const freshSince = new Date(Date.now() - ORDER_FRESH_DAYS_MS).toISOString()
          const visibleAfter = new Date(Date.now() - ORDER_EARLY_ACCESS_MS).toISOString()
          const delayFreshOrders = user.role === 'master' && hasEarlyAccess === false

          let query = supabase
            .from('orders')
            .select(`*, client:profiles!client_id(id, full_name, avatar_url)`, { count: 'exact' })
            .in('status', ['open', 'new'])
            .neq('client_id', user.id)
            .gte('created_at', freshSince)
            .order('created_at', { ascending: false })
            .range(from, to)

          if (delayFreshOrders) {
            query = query.lte('created_at', visibleAfter)
          }

          if (filterMode === 'my_specializations' && mySpecializations.length > 0) {
            query = query.in('category', mySpecializations)
          } else if (filterMode === 'my_specializations') {
            setOrders([])
            setHasMore(false)
            return
          }
          if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          }
          if (selectedCity) query = query.ilike('city', `%${selectedCity}%`)

          const { data, error, count } = await query
          if (error) throw error
          const list = (data || []) as Order[]
          setOrders((prev) => (reset ? list : [...prev, ...list]))
          setHasMore(list.length === ITEMS_PER_PAGE && (count ?? 0) > pageNum * ITEMS_PER_PAGE)
        } else if (activeTab === 'my_response') {
          const { data: responses } = await supabase
            .from('order_responses')
            .select('order_id')
            .eq('master_id', user.id)
            .order('created_at', { ascending: false })
            .range(from, to)

          const orderIds = (responses || []).map((r) => r.order_id)
          if (!orderIds.length) {
            setOrders([])
            setHasMore(false)
            return
          }
          const { data } = await supabase
            .from('orders')
            .select(`*, client:profiles!client_id(id, full_name, avatar_url)`)
            .in('id', orderIds)
            .order('created_at', { ascending: false })
          setOrders((data || []) as Order[])
          setHasMore((responses?.length ?? 0) === ITEMS_PER_PAGE)
        } else if (activeTab === 'in_progress') {
          const { data, error, count } = await supabase
            .from('orders')
            .select(`*, client:profiles!client_id(id, full_name, avatar_url)`, { count: 'exact' })
            .eq('status', 'in_progress')
            .eq('selected_master_id', user.id)
            .order('created_at', { ascending: false })
            .range(from, to)
          if (error) throw error
          const list = (data || []) as Order[]
          setOrders((prev) => (reset ? list : [...prev, ...list]))
          setHasMore(list.length === ITEMS_PER_PAGE && (count ?? 0) > pageNum * ITEMS_PER_PAGE)
        }
      } catch (e) {
        console.error('fetchOrders:', e)
        if (reset) setOrders([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [user, isOwnerUi, activeTab, searchQuery, selectedCity, filterMode, mySpecializations, hasEarlyAccess]
  )

  useEffect(() => {
    if (!user) return
    if (user.role === 'master' && hasEarlyAccess === null) return
    loadStats()
    setPage(1)
    setHasMore(true)
    fetchOrders(1, true)
  }, [user, activeTab, searchQuery, selectedCity, filterMode, mySpecializations, hasEarlyAccess, fetchOrders, loadStats])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore || loadingMore || loading) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          const next = page + 1
          setPage(next)
          fetchOrders(next, false)
        }
      },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loading, page, fetchOrders])

  const stats = useMemo(() => {
    if (isOwnerUi) return countByStatus(statsSource.length ? statsSource : orders)
    return {
      new: availableCount,
      in_progress: statsSource.filter((o) => o.status === 'in_progress').length,
      completed: 0,
      cancelled: 0,
    }
  }, [isOwnerUi, statsSource, orders, availableCount])

  const showAuthorCards = isOwnerUi || activeTab === 'mine'

  const activeOrder = useMemo(
    () => (showAuthorCards ? orders.find((o) => o.status === 'in_progress') : null),
    [showAuthorCards, orders]
  )

  const gridOrders = useMemo(
    () => (activeOrder ? orders.filter((o) => o.id !== activeOrder.id) : orders),
    [orders, activeOrder]
  )

  if (authLoading || (loading && orders.length === 0)) {
    return null
  }

  if (!user) return null

  const masterInProgressCount = isOwnerUi
    ? stats.in_progress
    : statsSource.filter((o) => o.status === 'in_progress').length

  return (
    <div className="min-h-screen bg-[#f5f5f7] max-w-lg mx-auto w-full pb-24">
      <Navbar />

      <div className="bg-white border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between px-4 pt-3 pb-3 gap-2">
          <h1 className="text-[17px] font-extrabold text-[#111] min-w-0">
            {isOwnerUi ? (
              'Мои заказы'
            ) : (
              <>
                Заказы
                {(notificationCount > 0 || availableCount > 0) && (
                  <span className="ml-1.5 bg-[#e63946] text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md align-middle">
                    {availableCount || notificationCount} новых
                  </span>
                )}
              </>
            )}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isMaster && (
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-1 bg-[#f5f5f7] border border-[#eee] rounded-xl px-3 py-2 text-xs font-semibold text-[#555]"
              >
                ⚙ Фильтр
              </button>
            )}
            <Link
              href="/orders/new"
              className="flex items-center gap-1 bg-[#e63946] text-white text-xs font-bold px-4 py-2 rounded-full"
            >
              <span className="text-base leading-none">+</span>
              Создать
            </Link>
          </div>
        </div>

        {isOwnerUi ? (
          <div className="grid grid-cols-4 gap-1.5 px-4 pb-3">
            {[
              { num: stats.new, label: 'Новые', color: '#e63946' },
              { num: stats.in_progress, label: 'В работе', color: '#f4a228' },
              { num: stats.completed, label: 'Готово', color: '#22a85e' },
              { num: stats.cancelled, label: 'Отменены', color: '#aaa' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl py-2 px-1 text-center border border-[#f0f0f0]">
                <p className="text-[16px] font-extrabold" style={{ color: s.color }}>
                  {s.num}
                </p>
                <p className="text-[8px] text-[#aaa] font-medium leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 px-4 pb-3">
            {[
              { num: availableCount, label: 'Доступны', color: '#e63946' },
              { num: myResponsesCount, label: 'Мои отклики', color: '#f4a228' },
              { num: masterInProgressCount, label: 'В работе', color: '#22a85e' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl py-2 px-1 text-center border border-[#f0f0f0]">
                <p className="text-[16px] font-extrabold" style={{ color: s.color }}>
                  {s.num}
                </p>
                <p className="text-[8px] text-[#aaa] font-medium leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex border-b-[1.5px] border-[#f0f0f0] overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[4.5rem] text-center py-2.5 text-[11px] font-semibold border-b-2 -mb-[1.5px] transition-colors ${
                activeTab === tab.key
                  ? 'text-[#e63946] border-[#e63946]'
                  : 'text-[#aaa] border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isMaster && activeTab === 'available' && hasEarlyAccess === false && hiddenFreshCount > 0 && (
        <div className="mx-4 mt-3 rounded-2xl border border-[#f4a228]/40 bg-[#fffaf0] px-3.5 py-3">
          <p className="text-[12px] font-bold text-[#111] leading-snug">
            🔒 Ещё {hiddenFreshCount}{' '}
            {hiddenFreshCount === 1 ? 'новый заказ доступен' : 'новых заказов доступны'} PRO-мастерам прямо сейчас
          </p>
          <p className="mt-1 text-[11px] text-[#888] leading-relaxed">
            Вам — через 24 часа после публикации.{' '}
            <Link href="/pro" className="font-bold text-[#e63946] underline-offset-2 hover:underline">
              Подключить PRO →
            </Link>
          </p>
        </div>
      )}

      {activeOrder && (
        <div className="px-4 pt-3 pb-1">
          <Link
            href={`/orders/${activeOrder.id}`}
            className="block bg-[#fffaf0] border-[1.5px] border-[#f4a228] rounded-2xl p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{getCategoryIcon(activeOrder.category)}</span>
                <span className="text-[13px] font-bold text-[#111] truncate">{activeOrder.title}</span>
              </div>
              <span className="text-[8px] font-bold bg-[#fff8e6] text-[#cc8800] px-2 py-1 rounded-full flex-shrink-0">
                В работе
              </span>
            </div>
            <p className="text-[11px] text-[#888] mb-3">Мастер принят · Выполняется прямо сейчас</p>
            <div className="flex gap-2">
              <span className="flex-1 bg-white border border-[#f0f0f0] rounded-xl py-2 text-center text-[10px] font-bold text-[#111]">
                💬 Чат с мастером
              </span>
              <span className="flex-1 bg-[#e63946] rounded-xl py-2 text-center text-[10px] font-bold text-white">
                ✓ Завершить заказ
              </span>
            </div>
          </Link>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 px-4 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-36 border border-[#f0f0f0] animate-pulse" />
          ))}
        </div>
      ) : gridOrders.length === 0 ? (
        <OrdersEmptyState role={user.role} activeTab={activeTab} />
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
            <span className="text-[12px] font-bold text-[#111]">
              {activeOrder
                ? 'Остальные заказы'
                : showAuthorCards
                  ? 'Заказы'
                  : activeTab === 'available'
                    ? 'Доступные заказы'
                    : 'Заказы'}
            </span>
            <span className="text-[10px] text-[#aaa]">{gridOrders.length} заказов</span>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            {gridOrders.map((order) => (
              <OrderGridCard
                key={order.id}
                order={order}
                isClient={showAuthorCards}
                responseCount={responseCounts[order.id] ?? 0}
              />
            ))}
          </div>
          {loadingMore && <p className="text-center text-xs text-[#888] py-2">Загрузка…</p>}
          <div ref={loadMoreRef} className="h-2" aria-hidden />
        </>
      )}

      {showFilters && isMaster && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowFilters(false)}>
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-[#111] mb-4">Фильтр заказов</p>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию"
              className="w-full mb-3 px-3 py-2 rounded-xl border border-[#ececec] bg-[#f5f5f7] text-sm"
            />
            <input
              type="text"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              placeholder="Город"
              className="w-full mb-3 px-3 py-2 rounded-xl border border-[#ececec] bg-[#f5f5f7] text-sm"
            />
            <button
              type="button"
              onClick={() => setFilterMode(filterMode === 'all' ? 'my_specializations' : 'all')}
              className={`w-full mb-4 py-2.5 rounded-xl text-sm font-semibold border ${
                filterMode === 'my_specializations'
                  ? 'border-[#e63946] bg-[#fff1f2] text-[#e63946]'
                  : 'border-[#eee] text-[#555]'
              }`}
            >
              По моим специализациям
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="w-full bg-[#e63946] text-white py-3 rounded-xl font-bold text-sm"
            >
              Применить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
