'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import OrderCard from '@/components/OrderCard'
import AdBannerSlider from '@/components/AdBannerSlider'
import Link from 'next/link'
import { FiSearch, FiPlus, FiList, FiGrid, FiMap } from 'react-icons/fi'
import { getMasterAccess } from '@/lib/masterAccess'

const categories = [
  'Все категории',
  'Строительство',
  'Ремонт',
  'Сантехника',
  'Электрика',
  'Отделка',
  'Кровля',
  'Окна и двери',
  'Ландшафт',
  'Другое',
]

const statuses = [
  'Все статусы',
  'Открыт',
  'Новый',
  'В работе',
  'Выполнен',
  'Отменен',
]

const statusMap: Record<string, string> = {
  'Открыт': 'open',
  'Новый': 'new',
  'В работе': 'in_progress',
  'Выполнен': 'completed',
  'Отменен': 'cancelled',
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [disableMasterRestrictions, setDisableMasterRestrictions] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'my_specializations'>('all')
  const [mySpecializations, setMySpecializations] = useState<string[]>([])
  const [notificationCount, setNotificationCount] = useState(0)
  
  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    // флаги ограничений (глобальный выключатель)
    fetch('/api/pro/settings')
      .then((r) => r.json())
      .then((d) => setDisableMasterRestrictions(!!d?.disableMasterRestrictions))
      .catch(() => {})
  }, [])

  // Загружаем специализации мастера
  useEffect(() => {
    if (user && user.role === 'master') {
      const fetchMySpecializations = async () => {
        try {
          const { data, error } = await supabase
            .from('profile_specializations')
            .select('specialization:specializations(name)')
            .eq('profile_id', user.id)

          if (error) {
            console.error('Error fetching specializations:', error)
            setMySpecializations([])
            return
          }
          
          const specNames = (data || [])
            .map((item: any) => item.specialization?.name)
            .filter((name: string | undefined): name is string => !!name)
          
          console.log('Loaded specializations:', specNames) // Для отладки
          setMySpecializations(specNames)
        } catch (error) {
          console.error('Error fetching specializations:', error)
          setMySpecializations([])
        }
      }

      fetchMySpecializations()
    } else {
      setMySpecializations([])
    }
  }, [user])

  // Загружаем количество непрочитанных уведомлений
  useEffect(() => {
    if (user && user.role === 'master') {
      const fetchNotificationCount = async () => {
        try {
          const res = await fetch('/api/notifications/count')
          const data = await res.json()
          setNotificationCount(data.count || 0)
        } catch (error) {
          console.error('Error fetching notification count:', error)
        }
      }

      fetchNotificationCount()
      // Обновляем каждые 30 секунд
      const interval = setInterval(fetchNotificationCount, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      setPage(1)
      setOrders([])
      setHasMore(true)
      fetchOrders(1, true)
    }
  }, [user, searchQuery, selectedCategory, selectedStatus, selectedCity, filterMode, mySpecializations])


  const fetchOrders = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const from = (pageNum - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      let query = supabase
        .from('orders')
        .select(`*, client:profiles!client_id(id, full_name, avatar_url, city, phone)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      // Фильтр по специализациям мастера
      if (filterMode === 'my_specializations') {
        if (mySpecializations.length === 0) {
          // Если специализаций нет, показываем пустой список
          console.log('No specializations found for master')
          setOrders([])
          setHasMore(false)
          setLoading(false)
          setLoadingMore(false)
          return
        }
        
        // Фильтруем заказы, категории которых совпадают со специализациями мастера
        // Используем .in() для фильтрации по списку категорий (более надежно, чем .or())
        console.log('Filtering by specializations:', mySpecializations)
        query = query.in('category', mySpecializations)
      }

      // Поиск
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      // Фильтр по категории (только если не фильтруем по специализациям)
      if (filterMode === 'all' && selectedCategory) {
        query = query.eq('category', selectedCategory)
      }

      // Фильтр по статусу
      if (selectedStatus) {
        query = query.eq('status', statusMap[selectedStatus])
      }

      // Фильтр по городу
      if (selectedCity) {
        query = query.ilike('city', `%${selectedCity}%`)
      }

      const { data, error, count } = await query

      if (error) throw error
      const newOrders = (data || []) as Order[]
      
      if (reset) {
        setOrders(newOrders)
      } else {
        setOrders(prev => [...prev, ...newOrders])
      }

      // Проверяем, есть ли ещё данные
      setHasMore(newOrders.length === ITEMS_PER_PAGE && (count || 0) > pageNum * ITEMS_PER_PAGE)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchOrders(nextPage, false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-primary pb-28 flex items-center justify-center">
        <div className="text-lg text-text-secondary">Загрузка...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const access = getMasterAccess(user)
  const hideClientIdentity = user.role === 'master' && !disableMasterRestrictions && !access.isPro && !access.isTrial

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      {/* Баннеры без отступов по бокам */}
      <div className="w-full mb-6">
        <AdBannerSlider page="orders" />
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-semibold text-graphite-secondary mb-3 tracking-tight">Заказы</h1>
              <p className="text-text-secondary">Найдите подходящий заказ или создайте свой</p>
            </div>
            <div className="flex items-center gap-3">
              {user.role === 'master' && notificationCount > 0 && (
                <div className="relative">
                  <div className="absolute -top-2 -right-2 bg-brand-accent text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </div>
                </div>
              )}
              <Link
                href="/orders/new"
                className="btn btn-primary flex items-center gap-2"
              >
                <FiPlus size={20} />
                <span>Создать заказ</span>
              </Link>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card mb-8 animate-fade-in">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={16} strokeWidth={2} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Какой заказ ищете?"
                  className="input pl-10 h-10 text-sm w-full"
                />
              </div>
              <input
                type="text"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                placeholder="Город"
                className="input w-full h-10 text-sm"
              />
              {filterMode === 'all' && (
                <div className={`relative select-wrapper w-full ${selectedCategory ? 'has-value' : ''}`} data-placeholder="Специализация">
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input w-full h-10 text-sm appearance-none cursor-pointer"
                    style={{
                      color: !selectedCategory ? 'transparent' : 'var(--text-primary)',
                    }}
                  >
                    <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                      Специализация
                    </option>
                    {categories.filter(cat => cat !== 'Все категории').map((cat) => (
                      <option key={cat} value={cat} style={{ color: 'var(--text-primary)' }}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {filterMode === 'my_specializations' && (
                <>
                  {mySpecializations.length === 0 ? (
                    <div className="text-sm text-text-secondary px-4 py-2">
                      У вас нет выбранных специализаций. Добавьте их в профиле, чтобы видеть подходящие заказы.
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted px-4 py-2">
                      Показаны заказы по специализациям: {mySpecializations.join(', ')}
                    </div>
                  )}
                </>
              )}
              <div className={`relative select-wrapper w-full ${selectedStatus ? 'has-value' : ''}`} data-placeholder="Статус">
                <select
                  value={selectedStatus || ''}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input w-full h-10 text-sm appearance-none cursor-pointer"
                  style={{
                    color: !selectedStatus ? 'transparent' : 'var(--text-primary)',
                  }}
                >
                  <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                    Статус
                  </option>
                  {statuses.filter(status => status !== 'Все статусы').map((status) => (
                    <option key={status} value={status} style={{ color: 'var(--text-primary)' }}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Filter Mode Tabs (для мастеров) */}
          {user.role === 'master' && (
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-brand-accent text-white'
                    : 'bg-bg-card text-text-secondary hover:text-text-primary border border-border-light/60'
                }`}
              >
                Все заказы
              </button>
              <button
                onClick={() => setFilterMode('my_specializations')}
                className={`px-4 py-2 rounded-md font-medium transition-colors relative ${
                  filterMode === 'my_specializations'
                    ? 'bg-brand-accent text-white'
                    : 'bg-bg-card text-text-secondary hover:text-text-primary border border-border-light/60'
                }`}
              >
                По моим специализациям
                {notificationCount > 0 && (
                  <span className="ml-2 bg-white text-brand-accent text-xs font-bold rounded-full px-2 py-0.5">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* View Mode Tabs */}
          <div className="flex gap-1 mb-8 bg-bg-card rounded-lg p-1.5 border border-border-light/60 w-fit">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-brand-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              <FiList size={18} />
              Список
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                viewMode === 'grid'
                  ? 'bg-brand-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
              }`}
            >
              <FiGrid size={18} />
              Сетка
            </button>
          </div>

          {/* Orders List */}
          {viewMode === 'list' && (
            <div className="space-y-5">
              {orders.length === 0 && !loading ? (
                <div className="card text-center py-12">
                  <p className="text-base font-medium text-graphite-secondary mb-3">
                    Заказы не найдены
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Попробуйте изменить фильтры или создайте новый заказ
                  </p>
                  <Link href="/orders/new" className="btn btn-primary">
                    Создать заказ
                  </Link>
                </div>
              ) : (
                <>
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} variant="list" hideClientIdentity={hideClientIdentity} />
                  ))}
                  
                  {/* Load More Button */}
                  {hasMore && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="btn btn-secondary"
                      >
                        {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Orders Grid */}
          {viewMode === 'grid' && (
            <>
              {orders.length === 0 && !loading ? (
                <div className="card text-center py-12">
                  <p className="text-base font-medium text-graphite-secondary mb-3">
                    Заказы не найдены
                  </p>
                  <p className="text-sm text-text-secondary mb-6">
                    Попробуйте изменить фильтры или создайте новый заказ
                  </p>
                  <Link href="/orders/new" className="btn btn-primary">
                    Создать заказ
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:gap-5">
                    {orders.map((order) => (
                      <OrderCard key={order.id} order={order} variant="grid" hideClientIdentity={hideClientIdentity} />
                    ))}
                  </div>
                  
                  {/* Load More Button */}
                  {hasMore && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="btn btn-secondary"
                      >
                        {loadingMore ? 'Загрузка...' : 'Загрузить ещё'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  )
}
