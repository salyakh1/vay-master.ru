'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { FiTrendingUp, FiUsers, FiBriefcase, FiShoppingBag, FiAlertCircle, FiBarChart2 } from 'react-icons/fi'

type Period = 'day' | 'week' | 'month'

type PeriodStats = {
  period: Period
  total: { users: number; orders: number; masters: number; sellers: number; pro: number }
  period_stats: {
    new_users: number
    new_orders: number
    new_products: number
    new_messages: number
    new_complaints: number
    new_pro_payments: number
  }
  revenue_rub: number
  pro_revenue_rub: number
  pro_conversion_pct: number
}

const PERIOD_LABEL: Record<Period, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
}

export default function AdminAnalyticsPage() {
  const { user: currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({})
  const [period, setPeriod] = useState<Period>('week')
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null)
  const [periodLoading, setPeriodLoading] = useState(false)

  useEffect(() => {
    fetchAnalytics()
    if (currentUser) {
      logAdminAction(currentUser.id, 'view_analytics', 'analytics')
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    void fetchPeriodStats(period)
  }, [currentUser, period])

  const fetchPeriodStats = async (p: Period) => {
    try {
      setPeriodLoading(true)
      const { data: session } = await supabase.auth.getSession()
      const token = session.session?.access_token
      if (!token) return

      const res = await fetch(`/api/admin/stats?period=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('stats failed')
      const json = (await res.json()) as PeriodStats
      setPeriodStats(json)
    } catch (e) {
      console.error('period stats', e)
      setPeriodStats(null)
    } finally {
      setPeriodLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      const [
        { count: totalUsers },
        { count: totalMasters },
        { count: totalSellers },
        { count: totalOrders },
        { count: newOrders },
        { count: completedOrders },
        { count: totalProducts },
        { count: totalPortfolioItems },
        { count: totalComplaints },
        { count: unresolvedComplaints },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'master'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('portfolio_items').select('*', { count: 'exact', head: true }),
        supabase.from('complaints').select('*', { count: 'exact', head: true }),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['new', 'in_review']),
      ])

      const { data: ordersData } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'new')
        .limit(1000)

      const orderIds = ordersData?.map((o) => o.id) || []
      const { data: responsesData } = await supabase
        .from('order_responses')
        .select('order_id')
        .in('order_id', orderIds)

      const ordersWithResponses = new Set(responsesData?.map((r) => r.order_id) || [])
      const ordersWithoutResponses = orderIds.filter((id) => !ordersWithResponses.has(id)).length

      const { data: ordersByCategory } = await supabase
        .from('orders')
        .select('category')
        .limit(1000)

      const categoryCounts = new Map<string, number>()
      ordersByCategory?.forEach((order) => {
        categoryCounts.set(order.category, (categoryCounts.get(order.category) || 0) + 1)
      })

      const popularCategories = Array.from(categoryCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

      setStats({
        totalUsers: totalUsers || 0,
        totalMasters: totalMasters || 0,
        totalSellers: totalSellers || 0,
        totalOrders: totalOrders || 0,
        newOrders: newOrders || 0,
        completedOrders: completedOrders || 0,
        totalProducts: totalProducts || 0,
        totalPortfolioItems: totalPortfolioItems || 0,
        totalComplaints: totalComplaints || 0,
        unresolvedComplaints: unresolvedComplaints || 0,
        ordersWithoutResponses,
        popularCategories,
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-text-secondary">Загрузка аналитики...</div>
  }

  const ps = periodStats?.period_stats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Аналитика</h1>
        <p className="text-text-secondary">Статистика и метрики платформы</p>
      </div>

      {/* Period switcher */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">За период</h2>
            <p className="text-sm text-text-secondary">Новые события и выручка</p>
          </div>
          <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
            {(['day', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-brand-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        {periodLoading && !periodStats ? (
          <p className="text-sm text-text-secondary">Загрузка…</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-bg-secondary p-3">
              <div className="text-xs text-text-secondary">Новые пользователи</div>
              <div className="text-xl font-bold text-text-primary">{ps?.new_users ?? '—'}</div>
            </div>
            <div className="rounded-lg bg-bg-secondary p-3">
              <div className="text-xs text-text-secondary">Новые заказы</div>
              <div className="text-xl font-bold text-text-primary">{ps?.new_orders ?? '—'}</div>
            </div>
            <div className="rounded-lg bg-bg-secondary p-3">
              <div className="text-xs text-text-secondary">PRO оплат</div>
              <div className="text-xl font-bold text-brand-accent">{ps?.new_pro_payments ?? '—'}</div>
            </div>
            <div className="rounded-lg bg-bg-secondary p-3">
              <div className="text-xs text-text-secondary">Выручка за период</div>
              <div className="text-xl font-bold text-green-600">
                {periodStats ? `${periodStats.revenue_rub.toLocaleString('ru-RU')} ₽` : '—'}
              </div>
            </div>
            <div className="rounded-lg bg-bg-secondary p-3">
              <div className="text-xs text-text-secondary">Выручка PRO</div>
              <div className="text-xl font-bold text-text-primary">
                {periodStats ? `${periodStats.pro_revenue_rub.toLocaleString('ru-RU')} ₽` : '—'}
              </div>
            </div>
            <div className="rounded-lg bg-bg-secondary p-3">
              <div className="text-xs text-text-secondary">Новые товары</div>
              <div className="text-xl font-bold text-text-primary">{ps?.new_products ?? '—'}</div>
            </div>
            <div className="rounded-lg bg-bg-secondary p-3">
              <div className="text-xs text-text-secondary">Сообщения</div>
              <div className="text-xl font-bold text-text-primary">{ps?.new_messages ?? '—'}</div>
            </div>
            <div className="rounded-lg bg-bg-secondary p-3">
              <div className="text-xs text-text-secondary">Жалобы</div>
              <div className="text-xl font-bold text-text-primary">{ps?.new_complaints ?? '—'}</div>
            </div>
          </div>
        )}

        {periodStats && (
          <p className="text-xs text-text-muted">
            PRO среди мастеров: {periodStats.total.pro} / {periodStats.total.masters} (
            {periodStats.pro_conversion_pct}%)
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Всего пользователей</div>
              <div className="text-2xl font-bold text-text-primary">{stats.totalUsers}</div>
            </div>
            <FiUsers className="text-text-secondary" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Мастеров</div>
              <div className="text-2xl font-bold text-text-primary">{stats.totalMasters}</div>
            </div>
            <FiBriefcase className="text-text-secondary" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Продавцов</div>
              <div className="text-2xl font-bold text-text-primary">{stats.totalSellers}</div>
            </div>
            <FiShoppingBag className="text-text-secondary" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Всего заказов</div>
              <div className="text-2xl font-bold text-text-primary">{stats.totalOrders}</div>
            </div>
            <FiBarChart2 className="text-text-secondary" size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-text-secondary">Новые заказы (статус)</div>
          <div className="text-2xl font-bold text-brand-accent">{stats.newOrders}</div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">Завершено</div>
          <div className="text-2xl font-bold text-green-600">{stats.completedOrders}</div>
        </div>
        <div className="card border-yellow-400">
          <div className="text-sm text-text-secondary">Без откликов</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.ordersWithoutResponses}</div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">Конверсия</div>
          <div className="text-2xl font-bold text-text-primary">
            {stats.totalOrders > 0
              ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)
              : '0.0'}
            %
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-text-secondary">Товаров</div>
          <div className="text-2xl font-bold text-text-primary">{stats.totalProducts}</div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">Работ в портфолио</div>
          <div className="text-2xl font-bold text-text-primary">{stats.totalPortfolioItems}</div>
        </div>
        <div className="card border-red-400">
          <div className="text-sm text-text-secondary">Нерешенных жалоб</div>
          <div className="text-2xl font-bold text-red-600">{stats.unresolvedComplaints}</div>
        </div>
      </div>

      {stats.popularCategories && stats.popularCategories.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Популярные категории заказов</h2>
          <div className="space-y-2">
            {stats.popularCategories.map(([category, count]: [string, number]) => (
              <div key={category} className="flex items-center justify-between p-2 bg-bg-secondary rounded">
                <span className="text-text-primary">{category}</span>
                <span className="font-semibold text-text-primary">{count} заказов</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card border-yellow-400">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FiAlertCircle className="text-yellow-600" size={20} />
          Проблемные зоны
        </h2>
        <div className="space-y-2">
          {stats.ordersWithoutResponses > 0 && (
            <div className="p-2 bg-yellow-50 rounded">
              <div className="font-medium text-yellow-900">
                {stats.ordersWithoutResponses} заказов без откликов мастеров
              </div>
              <div className="text-sm text-yellow-700">
                Рекомендуется проверить эти заказы и при необходимости найти мастеров
              </div>
            </div>
          )}
          {stats.unresolvedComplaints > 0 && (
            <div className="p-2 bg-red-50 rounded">
              <div className="font-medium text-red-900">{stats.unresolvedComplaints} нерешенных жалоб</div>
              <div className="text-sm text-red-700">Требуется внимание модераторов</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
