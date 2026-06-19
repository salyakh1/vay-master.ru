'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../providers'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { formatAdminNumber } from '@/components/admin/adminNavConfig'
import {
  AdminAvatar,
  AdminPanel,
  AdminQuickAction,
  AdminRoleBadge,
  AdminSectionTitle,
  AdminStatCard,
  AdminStatusBadge,
} from '@/components/admin/AdminUI'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

type DashboardStats = {
  totalUsers: number
  activeOrders: number
  proCount: number
  newComplaints: number
  moderationPending: number
}

type RecentUser = {
  id: string
  full_name: string | null
  role: string
  city: string | null
  created_at: string
}

type AuditLog = {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  created_at: string
  details?: Record<string, unknown> | null
}

type AttentionOrder = {
  id: string
  title: string
  budget: number | null
  city: string | null
  status: string
  responses_count?: number
  client?: { full_name?: string | null } | null
}

const ACTION_ICONS: Record<string, { icon: string; bg: string }> = {
  view_dashboard: { icon: '📊', bg: '#f2f2f7' },
  view_users: { icon: '👥', bg: '#eaf1fb' },
  view_complaints: { icon: '🚩', bg: '#fdf0f0' },
  view_moderation: { icon: '⏳', bg: '#fff8e6' },
  create_banner: { icon: '🖼️', bg: '#f2f2f7' },
  moderate_content: { icon: '✓', bg: '#edfff5' },
  restrict_user: { icon: '🚫', bg: '#fdf0f0' },
  default: { icon: '📜', bg: '#f2f2f7' },
}

function formatActionText(log: AuditLog): string {
  const map: Record<string, string> = {
    view_dashboard: 'Просмотр дашборда',
    view_users: 'Просмотр пользователей',
    view_complaints: 'Просмотр жалоб',
    view_moderation: 'Просмотр модерации',
    create_banner: 'Создан баннер',
    moderate_content: 'Контент промодерирован',
    restrict_user: 'Пользователь ограничен',
    delete_user: 'Пользователь удалён',
    verify_master: 'Мастер верифицирован',
  }
  if (map[log.action]) return map[log.action]
  if (log.resource_id) return `${log.action} · ${log.resource_type} #${log.resource_id.slice(0, 8)}`
  return log.action
}

function orderStatusVariant(status: string): 'pending' | 'active' | 'dispute' {
  if (status === 'in_progress') return 'active'
  if (status === 'cancelled') return 'dispute'
  return 'pending'
}

function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    new: 'Новый',
    in_progress: 'В работе',
    completed: 'Завершён',
    cancelled: 'Отменён',
  }
  return map[status] ?? status
}

export default function AdminDashboard() {
  const { user: currentUser } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeOrders: 0,
    proCount: 0,
    newComplaints: 0,
    moderationPending: 0,
  })
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [attentionOrders, setAttentionOrders] = useState<AttentionOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchDashboard()
    if (currentUser) logAdminAction(currentUser.id, 'view_dashboard', 'dashboard')
  }, [currentUser])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const [
        usersRes,
        ordersRes,
        proRes,
        complaintsRes,
        moderationRes,
        recentRes,
        logsRes,
        ordersListRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['new', 'in_progress']),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_pro', true),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['new', 'in_review']),
        supabase.from('content_moderation').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('id, full_name, role, city, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('admin_audit_logs').select('id, action, resource_type, resource_id, created_at, details').order('created_at', { ascending: false }).limit(4),
        supabase
          .from('orders')
          .select('id, title, budget, city, status, created_at, client:profiles!client_id(full_name)')
          .in('status', ['new', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setStats({
        totalUsers: usersRes.count ?? 0,
        activeOrders: ordersRes.count ?? 0,
        proCount: proRes.count ?? 0,
        newComplaints: complaintsRes.count ?? 0,
        moderationPending: moderationRes.count ?? 0,
      })
      setRecentUsers((recentRes.data as RecentUser[]) ?? [])
      setAuditLogs((logsRes.data as AuditLog[]) ?? [])
      setAttentionOrders((ordersListRes.data as AttentionOrder[]) ?? [])
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-[#8e8e93] text-sm">Загрузка...</div>
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard icon="👥" iconBg="#fdf0f0" value={formatAdminNumber(stats.totalUsers)} label="Всего пользователей" trend="—" trendVariant="flat" />
        <AdminStatCard icon="📋" iconBg="#eaf1fb" value={formatAdminNumber(stats.activeOrders)} label="Активные заказы" trend="—" trendVariant="flat" />
        <AdminStatCard icon="👑" iconBg="#fff8e6" value={formatAdminNumber(stats.proCount)} label="PRO подписок" trend="—" trendVariant="flat" />
        <AdminStatCard
          icon="🚩"
          iconBg="#fdf0f0"
          value={stats.newComplaints}
          label="Новые жалобы"
          trend={stats.newComplaints > 0 ? `+${stats.newComplaints}` : '0'}
          trendVariant={stats.newComplaints > 0 ? 'down' : 'flat'}
        />
      </div>

      <div>
        <AdminSectionTitle>Быстрые действия</AdminSectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <AdminQuickAction href="/admin/complaints" icon="🚩" label="Жалобы" count={stats.newComplaints > 0 ? `${stats.newComplaints} новых` : undefined} />
          <AdminQuickAction href="/admin/moderation" icon="⏳" label="На модерации" count={stats.moderationPending > 0 ? `${stats.moderationPending} профилей` : undefined} />
          <AdminQuickAction href="/admin/subscriptions" icon="👑" label="PRO заявки" count="Управление" />
          <AdminQuickAction href="/admin/banners" icon="🖼️" label="Баннеры" count="Реклама" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-3.5">
        <AdminPanel title="Новые пользователи" linkHref="/admin/users">
          <div className="hidden md:grid grid-cols-[36px_1fr_90px_80px_70px] items-center px-4 py-2 bg-[#f2f2f7] text-[9px] font-bold text-[#8e8e93] uppercase tracking-wide">
            <span />
            <span>Пользователь</span>
            <span>Роль</span>
            <span>Город</span>
            <span />
          </div>
          {recentUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#8e8e93]">Нет новых пользователей</div>
          ) : (
            recentUsers.map((u, i) => (
              <div
                key={u.id}
                className="grid grid-cols-1 md:grid-cols-[36px_1fr_90px_80px_70px] items-center gap-2 md:gap-0 px-4 py-2.5 border-b border-[#f5f5f7] last:border-0 text-xs"
              >
                <AdminAvatar name={u.full_name} colorIndex={i} />
                <div className="min-w-0">
                  <div className="font-semibold text-[#1c1c1e] truncate">{u.full_name || 'Без имени'}</div>
                  <div className="text-[10px] text-[#8e8e93]">
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: ru })}
                  </div>
                </div>
                <AdminRoleBadge role={u.role} />
                <span className="text-[10px] text-[#8e8e93] truncate hidden md:block">{u.city || '—'}</span>
                <Link href={`/profile/${u.id}`} className="text-[11px] text-brand-accent font-bold text-right">
                  Просмотр
                </Link>
              </div>
            ))
          )}
        </AdminPanel>

        <AdminPanel title="Журнал действий" linkHref="/admin/analytics">
          {auditLogs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#8e8e93]">Журнал пуст</div>
          ) : (
            auditLogs.map((log) => {
              const meta = ACTION_ICONS[log.action] ?? ACTION_ICONS.default
              return (
                <div key={log.id} className="flex gap-2.5 px-4 py-2.5 border-b border-[#f5f5f7] last:border-0">
                  <div
                    className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[13px] shrink-0"
                    style={{ background: meta.bg }}
                  >
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] text-[#1c1c1e] leading-snug">
                      <strong>{formatActionText(log)}</strong>
                    </div>
                    <div className="text-[10px] text-[#8e8e93] mt-0.5">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ru })}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </AdminPanel>
      </div>

      <div>
        <AdminSectionTitle>Заказы требующие внимания</AdminSectionTitle>
        <AdminPanel hideHeader>
          <div className="hidden md:grid grid-cols-[1fr_100px_90px_90px_70px] items-center px-4 py-2 bg-[#f2f2f7] text-[9px] font-bold text-[#8e8e93] uppercase tracking-wide border-b border-[#f5f5f7]">
            <span>Заказ</span>
            <span>Клиент</span>
            <span>Статус</span>
            <span>Бюджет</span>
            <span />
          </div>
          {attentionOrders.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#8e8e93]">Нет активных заказов</div>
          ) : (
            attentionOrders.slice(0, 4).map((order) => {
              const client = Array.isArray(order.client) ? order.client[0] : order.client
              return (
                <div
                  key={order.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_100px_90px_90px_70px] items-center gap-2 md:gap-0 px-4 py-2.5 border-b border-[#f5f5f7] last:border-0 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#1c1c1e] truncate">{order.title}</div>
                    <div className="text-[10px] text-[#8e8e93] truncate">
                      {order.budget ? `${order.budget.toLocaleString('ru-RU')} ₽` : '—'}
                      {order.city ? ` · ${order.city}` : ''}
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8e8e93] truncate hidden md:block">{client?.full_name || '—'}</span>
                  <AdminStatusBadge label={orderStatusLabel(order.status)} variant={orderStatusVariant(order.status)} />
                  <span className="text-[10px] text-[#8e8e93] hidden md:block">
                    {order.budget ? `${order.budget.toLocaleString('ru-RU')} ₽` : '—'}
                  </span>
                  <Link href={`/orders/${order.id}`} className="text-[11px] text-brand-accent font-bold text-right">
                    Открыть
                  </Link>
                </div>
              )
            })
          )}
        </AdminPanel>
      </div>

      {/* Mobile-only attention list */}
      <div className="lg:hidden space-y-2">
        <AdminSectionTitle>Требует внимания</AdminSectionTitle>
        {stats.newComplaints > 0 && (
          <Link href="/admin/complaints" className="flex items-center gap-2.5 bg-white rounded-xl p-3 border border-[#e5e5ea]">
            <div className="w-8 h-8 rounded-lg bg-[#fdf0f0] flex items-center justify-center text-sm">🚩</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#1c1c1e]">Новые жалобы</div>
              <div className="text-[10px] text-[#8e8e93]">Требуют обработки</div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#fdf0f0] text-brand-accent">{stats.newComplaints}</span>
          </Link>
        )}
        {stats.moderationPending > 0 && (
          <Link href="/admin/moderation" className="flex items-center gap-2.5 bg-white rounded-xl p-3 border border-[#e5e5ea]">
            <div className="w-8 h-8 rounded-lg bg-[#fff8e6] flex items-center justify-center text-sm">⏳</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#1c1c1e]">На модерации</div>
              <div className="text-[10px] text-[#8e8e93]">Проверить контент</div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#fdf0f0] text-brand-accent">{stats.moderationPending}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
