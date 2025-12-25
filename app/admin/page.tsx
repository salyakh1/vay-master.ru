'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../providers'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { FiUsers, FiBriefcase, FiShoppingBag, FiFileText, FiAlertCircle, FiTrendingUp } from 'react-icons/fi'

interface DashboardStats {
  totalUsers: number
  masters: number
  sellers: number
  clients: number
  totalOrders: number
  newOrders: number
  activeOrders: number
  totalComplaints: number
  newComplaints: number
}

export default function AdminDashboard() {
  const { user: currentUser } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    masters: 0,
    sellers: 0,
    clients: 0,
    totalOrders: 0,
    newOrders: 0,
    activeOrders: 0,
    totalComplaints: 0,
    newComplaints: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    if (currentUser) {
      logAdminAction(currentUser.id, 'view_dashboard', 'dashboard')
    }
  }, [currentUser])

  const fetchStats = async () => {
    try {
      setLoading(true)

      const [
        { count: totalUsers },
        { count: masters },
        { count: sellers },
        { count: clients },
        { count: totalOrders },
        { count: newOrders },
        { count: activeOrders },
        { count: totalComplaints },
        { count: newComplaints },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'master'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('complaints').select('*', { count: 'exact', head: true }),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['new', 'in_review']),
      ])

      setStats({
        totalUsers: totalUsers || 0,
        masters: masters || 0,
        sellers: sellers || 0,
        clients: clients || 0,
        totalOrders: totalOrders || 0,
        newOrders: newOrders || 0,
        activeOrders: activeOrders || 0,
        totalComplaints: totalComplaints || 0,
        newComplaints: newComplaints || 0,
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-text-secondary">Загрузка...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Дашборд</h1>
        <p className="text-text-secondary">Обзор платформы VAY-MASTER</p>
      </div>

      {/* Users Stats */}
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
              <div className="text-2xl font-bold text-text-primary">{stats.masters}</div>
            </div>
            <FiBriefcase className="text-text-secondary" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Продавцов</div>
              <div className="text-2xl font-bold text-text-primary">{stats.sellers}</div>
            </div>
            <FiShoppingBag className="text-text-secondary" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Клиентов</div>
              <div className="text-2xl font-bold text-text-primary">{stats.clients}</div>
            </div>
            <FiUsers className="text-text-secondary" size={24} />
          </div>
        </div>
      </div>

      {/* Orders Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Всего заказов</div>
              <div className="text-2xl font-bold text-text-primary">{stats.totalOrders}</div>
            </div>
            <FiFileText className="text-text-secondary" size={24} />
          </div>
        </div>
        <div className="card border-yellow-400">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Новых заказов</div>
              <div className="text-2xl font-bold text-brand-accent">{stats.newOrders}</div>
            </div>
            <FiTrendingUp className="text-yellow-500" size={24} />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">В работе</div>
              <div className="text-2xl font-bold text-text-primary">{stats.activeOrders}</div>
            </div>
            <FiBriefcase className="text-text-secondary" size={24} />
          </div>
        </div>
      </div>

      {/* Complaints Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Всего жалоб</div>
              <div className="text-2xl font-bold text-text-primary">{stats.totalComplaints}</div>
            </div>
            <FiAlertCircle className="text-text-secondary" size={24} />
          </div>
        </div>
        <div className="card border-red-400">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-text-secondary">Новых жалоб</div>
              <div className="text-2xl font-bold text-red-600">{stats.newComplaints}</div>
            </div>
            <FiAlertCircle className="text-red-500" size={24} />
          </div>
        </div>
      </div>
    </div>
  )
}
