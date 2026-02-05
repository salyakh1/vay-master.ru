'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiSearch, FiFilter, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi'
import Link from 'next/link'

interface Order {
  id: string
  client_id: string
  title: string
  description: string
  category: string
  location: string
  city?: string
  budget?: number
  images?: string[]
  status: 'new' | 'in_progress' | 'completed' | 'cancelled'
  selected_master_id?: string
  created_at: string
  updated_at?: string
  client?: any
  selected_master?: any
  responses_count?: number
  days_since_created?: number
}

const PAGE_SIZE = 20

export default function AdminOrdersPage() {
  const { user: currentUser } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderResponses, setOrderResponses] = useState<any[]>([])

  useEffect(() => {
    fetchOrders()
    if (currentUser) {
      logAdminAction(currentUser.id, 'view_orders', 'orders')
    }
  }, [currentUser, statusFilter, categoryFilter, page])

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase.from('orders').select('category').not('category', 'is', null)
      const unique = Array.from(new Set((data || []).map((o: any) => o.category).filter(Boolean)))
      setCategories(unique.sort())
    }
    loadCategories()
  }, [])

  const fetchOrders = async (pageOverride?: number) => {
    const currentPage = pageOverride ?? page
    try {
      setLoading(true)
      let countQuery = supabase.from('orders').select('*', { count: 'exact', head: true })
      let dataQuery = supabase
        .from('orders')
        .select(`
          *,
          client:profiles!client_id(id, full_name, email, city),
          selected_master:profiles!selected_master_id(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)

      if (statusFilter) {
        countQuery = countQuery.eq('status', statusFilter)
        dataQuery = dataQuery.eq('status', statusFilter)
      }
      if (categoryFilter) {
        countQuery = countQuery.eq('category', categoryFilter)
        dataQuery = dataQuery.eq('category', categoryFilter)
      }
      if (searchQuery) {
        const or = `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`
        countQuery = countQuery.or(or)
        dataQuery = dataQuery.or(or)
      }

      const [{ count }, { data: ordersData, error: ordersError }] = await Promise.all([
        countQuery,
        dataQuery,
      ])
      if (ordersError) throw ordersError
      setTotalCount(count ?? 0)

      const orderIds = (ordersData || []).map((o: any) => o.id)
      const { data: responsesData } = orderIds.length > 0
        ? await supabase.from('order_responses').select('order_id').in('order_id', orderIds)
        : { data: [] }

      const responsesCountMap = new Map<string, number>()
      responsesData?.forEach((r: any) => {
        responsesCountMap.set(r.order_id, (responsesCountMap.get(r.order_id) || 0) + 1)
      })

      const now = new Date()
      const ordersWithStats = (ordersData || []).map((order: any) => {
        const created = new Date(order.created_at)
        const daysSince = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        return {
          ...order,
          responses_count: responsesCountMap.get(order.id) || 0,
          days_since_created: daysSince,
        } as Order
      })
      setOrders(ordersWithStats)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderResponses = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_responses')
        .select(`
          *,
          master:profiles!master_id(id, full_name, email, city)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrderResponses(data || [])
    } catch (error) {
      console.error('Error fetching order responses:', error)
    }
  }

  const handleOrderClick = async (order: Order) => {
    setSelectedOrder(order)
    await fetchOrderResponses(order.id)
  }

  // Statistics (for current page only; total from totalCount)
  const stats = {
    total: totalCount,
    new: orders.filter((o) => o.status === 'new').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    no_responses: orders.filter((o) => (o.responses_count || 0) === 0 && o.status === 'new').length,
    stuck: orders.filter((o) => (o.days_since_created || 0) > 7 && o.status === 'new').length,
  }

  if (loading) {
    return <div className="text-text-secondary">Загрузка...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Управление заказами</h1>
        <p className="text-text-secondary">Просмотр, фильтрация и анализ всех заказов платформы</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="card">
          <div className="text-sm text-text-secondary">Всего в выборке</div>
          <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">Новые</div>
          <div className="text-2xl font-bold text-brand-accent">{stats.new}</div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">В работе</div>
          <div className="text-2xl font-bold text-text-primary">{stats.in_progress}</div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">Завершено</div>
          <div className="text-2xl font-bold text-text-primary">{stats.completed}</div>
        </div>
        <div className="card border-yellow-400">
          <div className="text-sm text-text-secondary">Без откликов</div>
          <div className="text-2xl font-bold text-text-primary">{stats.no_responses}</div>
        </div>
        <div className="card border-red-400">
          <div className="text-sm text-text-secondary">Зависшие (7+ дней)</div>
          <div className="text-2xl font-bold text-text-primary">{stats.stuck}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchOrders(1))}
              placeholder="Поиск по названию, описанию, адресу..."
              className="input pl-10 w-full h-10 text-sm"
            />
          </div>
          <div className={`relative select-wrapper w-full ${statusFilter ? 'has-value' : ''}`} data-placeholder="Статус">
            <select 
              value={statusFilter || ''} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="input w-full h-10 text-sm appearance-none cursor-pointer"
              style={{
                color: !statusFilter ? 'transparent' : 'var(--text-primary)',
              }}
            >
              <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                Статус
              </option>
              <option value="new">Новые</option>
              <option value="in_progress">В работе</option>
              <option value="completed">Завершенные</option>
              <option value="cancelled">Отмененные</option>
            </select>
          </div>
          <div className={`relative select-wrapper w-full ${categoryFilter ? 'has-value' : ''}`} data-placeholder="Категория">
            <select 
              value={categoryFilter || ''} 
              onChange={(e) => setCategoryFilter(e.target.value)} 
              className="input w-full h-10 text-sm appearance-none cursor-pointer"
              style={{
                color: !categoryFilter ? 'transparent' : 'var(--text-primary)',
              }}
            >
              <option value="">Все категории</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setPage(1); fetchOrders(1); }}
            className="btn btn-primary h-10 w-full text-sm"
          >
            Найти
          </button>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="text-sm text-text-secondary">
          Показано {orders.length} из {totalCount}
        </div>
      )}

      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => handleOrderClick(order)}
              className={`card cursor-pointer transition-colors ${
                selectedOrder?.id === order.id ? 'border-brand-accent border-2' : 'hover:shadow-lg'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-text-primary truncate">{order.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        order.status === 'new'
                          ? 'bg-blue-100 text-blue-700'
                          : order.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-700'
                          : order.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {order.status === 'new'
                        ? 'Новый'
                        : order.status === 'in_progress'
                        ? 'В работе'
                        : order.status === 'completed'
                        ? 'Завершен'
                        : 'Отменен'}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-2 line-clamp-2">{order.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <span>📁 {order.category}</span>
                    {order.location && <span>📍 {order.location}</span>}
                    {order.budget && <span>{order.budget.toLocaleString('ru-RU')} ₽</span>}
                    <span>{order.responses_count || 0} откликов</span>
                    {order.days_since_created !== undefined && order.days_since_created > 0 && (
                      <span className={order.days_since_created > 7 ? 'text-red-600' : ''}>
                        {order.days_since_created} дн. назад
                      </span>
                    )}
                  </div>
                  {order.client && (
                    <div className="mt-2 text-xs text-text-secondary">
                      Клиент: {order.client.full_name} {order.client.email}
                    </div>
                  )}
                  {order.selected_master && (
                    <div className="mt-1 text-xs text-brand-accent">Мастер: {order.selected_master.full_name}</div>
                  )}
                </div>
                {(order.responses_count || 0) === 0 && order.status === 'new' && (
                  <FiAlertCircle className="text-red-500 flex-shrink-0" size={20} title="Нет откликов" />
                )}
              </div>
            </div>
          ))}
        </div>

        {totalCount > PAGE_SIZE && (
          <div className="lg:col-span-2 flex items-center justify-between gap-4 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="btn btn-outline text-sm disabled:opacity-50"
            >
              ← Назад
            </button>
            <span className="text-sm text-text-secondary">
              Страница {page} из {Math.ceil(totalCount / PAGE_SIZE)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(totalCount / PAGE_SIZE) || loading}
              className="btn btn-outline text-sm disabled:opacity-50"
            >
              Вперёд →
            </button>
          </div>
        )}

        {/* Order Details */}
        {selectedOrder && (
          <div className="card">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Детали заказа</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-text-secondary mb-1">Название</div>
                <div className="font-medium text-text-primary">{selectedOrder.title}</div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Описание</div>
                <div className="text-sm text-text-primary">{selectedOrder.description}</div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Категория</div>
                <div className="font-medium text-text-primary">{selectedOrder.category}</div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Адрес</div>
                <div className="font-medium text-text-primary">{selectedOrder.location}</div>
              </div>
              {selectedOrder.budget && (
                <div>
                  <div className="text-sm text-text-secondary mb-1">Бюджет</div>
                  <div className="font-medium text-text-primary">{selectedOrder.budget.toLocaleString('ru-RU')} ₽</div>
                </div>
              )}
              <div>
                <div className="text-sm text-text-secondary mb-1">Статус</div>
                <div className="font-medium text-text-primary">
                  {selectedOrder.status === 'new'
                    ? 'Новый'
                    : selectedOrder.status === 'in_progress'
                    ? 'В работе'
                    : selectedOrder.status === 'completed'
                    ? 'Завершен'
                    : 'Отменен'}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-secondary mb-1">Создан</div>
                <div className="text-sm text-text-primary">
                  {format(new Date(selectedOrder.created_at), 'd MMMM yyyy, HH:mm', { locale: ru })}
                </div>
              </div>

              {/* Client */}
              {selectedOrder.client && (
                <div className="pt-4 border-t border-border-color">
                  <div className="text-sm font-semibold text-text-primary mb-2">Клиент</div>
                  <div className="text-sm text-text-secondary">
                    <div>{selectedOrder.client.full_name}</div>
                    <div>{selectedOrder.client.email}</div>
                    {selectedOrder.client.city && <div>{selectedOrder.client.city}</div>}
                  </div>
                </div>
              )}

              {/* Selected Master */}
              {selectedOrder.selected_master && (
                <div className="pt-4 border-t border-border-color">
                  <div className="text-sm font-semibold text-text-primary mb-2">Выбранный мастер</div>
                  <div className="text-sm text-text-secondary">
                    <div>{selectedOrder.selected_master.full_name}</div>
                    <div>{selectedOrder.selected_master.email}</div>
                  </div>
                </div>
              )}

              {/* Responses */}
              <div className="pt-4 border-t border-border-color">
                <div className="text-sm font-semibold text-text-primary mb-2">
                  Отклики ({orderResponses.length})
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {orderResponses.length === 0 ? (
                    <div className="text-sm text-text-secondary">Нет откликов</div>
                  ) : (
                    orderResponses.map((response) => (
                      <div key={response.id} className="p-2 bg-bg-secondary rounded text-sm">
                        <div className="font-medium text-text-primary mb-1">
                          {response.master?.full_name || 'Мастер'}
                        </div>
                        <div className="text-text-secondary mb-1">{response.message}</div>
                        {response.price && (
                          <div className="text-brand-accent font-medium">{response.price.toLocaleString('ru-RU')} ₽</div>
                        )}
                        <div className="text-xs text-text-secondary mt-1">
                          {format(new Date(response.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border-color">
                <Link href={`/orders/${selectedOrder.id}`} className="btn btn-primary w-full text-sm">
                  Открыть заказ
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

