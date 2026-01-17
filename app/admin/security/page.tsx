'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase } from '@/lib/supabase'
import { logAdminAction, type SecurityAlert } from '@/lib/admin'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiAlertTriangle, FiShield, FiCheckCircle, FiClock, FiUser } from 'react-icons/fi'

export default function AdminSecurityPage() {
  const { user: currentUser } = useAuth()
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [resolvedFilter, setResolvedFilter] = useState<string>('')

  useEffect(() => {
    fetchAlerts()
    if (currentUser) {
      logAdminAction(currentUser.id, 'view_security', 'security')
    }
  }, [currentUser, severityFilter, resolvedFilter])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('security_alerts')
        .select(`
          *,
          user:profiles!user_id(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (severityFilter) {
        query = query.eq('severity', severityFilter)
      }

      if (resolvedFilter === 'resolved') {
        query = query.eq('is_resolved', true)
      } else if (resolvedFilter === 'unresolved') {
        query = query.eq('is_resolved', false)
      }

      const { data, error } = await query
      if (error) throw error
      setAlerts((data || []) as SecurityAlert[])
    } catch (error) {
      console.error('Error fetching security alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveAlert = async (alertId: string) => {
    if (!currentUser) return

    try {
      await supabase
        .from('security_alerts')
        .update({
          is_resolved: true,
          resolved_by: currentUser.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId)

      await logAdminAction(currentUser.id, 'resolve_security_alert', 'security_alert', alertId)
      fetchAlerts()
    } catch (error) {
      console.error('Error resolving alert:', error)
      alert('Ошибка при разрешении алерта')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'mass_messages':
        return 'Массовые сообщения'
      case 'duplicate_texts':
        return 'Дублирование текстов'
      case 'suspicious_activity':
        return 'Подозрительная активность'
      case 'suspicious_registration':
        return 'Подозрительная регистрация'
      case 'rate_limit_exceeded':
        return 'Превышен лимит запросов'
      default:
        return type
    }
  }

  if (loading) {
    return <div className="text-text-secondary">Загрузка...</div>
  }

  const stats = {
    total: alerts.length,
    unresolved: alerts.filter((a) => !a.is_resolved).length,
    critical: alerts.filter((a) => a.severity === 'critical' && !a.is_resolved).length,
    high: alerts.filter((a) => a.severity === 'high' && !a.is_resolved).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Безопасность и антиспам</h1>
        <p className="text-text-secondary">Мониторинг алертов безопасности и подозрительной активности</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card border-red-400">
          <div className="text-sm text-text-secondary">Критические</div>
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
        </div>
        <div className="card border-orange-400">
          <div className="text-sm text-text-secondary">Высокий приоритет</div>
          <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
        </div>
        <div className="card border-yellow-400">
          <div className="text-sm text-text-secondary">Нерешенные</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.unresolved}</div>
        </div>
        <div className="card">
          <div className="text-sm text-text-secondary">Всего алертов</div>
          <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col gap-3">
          <div className={`relative select-wrapper w-full ${severityFilter ? 'has-value' : ''}`} data-placeholder="Уровень">
            <select 
              value={severityFilter || ''} 
              onChange={(e) => setSeverityFilter(e.target.value)} 
              className="input w-full h-10 text-sm appearance-none cursor-pointer"
              style={{
                color: !severityFilter ? 'transparent' : 'var(--text-primary)',
              }}
            >
              <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                Уровень
              </option>
              <option value="critical">Критический</option>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </select>
          </div>
          <div className={`relative select-wrapper w-full ${resolvedFilter ? 'has-value' : ''}`} data-placeholder="Статус">
            <select 
              value={resolvedFilter || ''} 
              onChange={(e) => setResolvedFilter(e.target.value)} 
              className="input w-full h-10 text-sm appearance-none cursor-pointer"
              style={{
                color: !resolvedFilter ? 'transparent' : 'var(--text-primary)',
              }}
            >
              <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                Статус
              </option>
              <option value="unresolved">Нерешенные</option>
              <option value="resolved">Решенные</option>
            </select>
          </div>
          <button onClick={fetchAlerts} className="btn btn-primary h-10 w-full text-sm">
            Обновить
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`card border-l-4 ${
              alert.is_resolved ? 'border-gray-300 opacity-60' : getSeverityColor(alert.severity).split(' ')[2]
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FiAlertTriangle
                    className={alert.is_resolved ? 'text-gray-400' : getSeverityColor(alert.severity).split(' ')[0]}
                    size={20}
                  />
                  <h3 className="font-semibold text-text-primary">{getAlertTypeLabel(alert.alert_type)}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  {alert.is_resolved && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Решено</span>
                  )}
                </div>
                {alert.details && (
                  <div className="text-sm text-text-secondary mb-2">
                    {typeof alert.details === 'string' ? alert.details : JSON.stringify(alert.details)}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                  {alert.user_id && (
                    <span>
                      <FiUser className="inline mr-1" size={12} />
                      {(alert as any).user?.full_name || (alert as any).user?.email || 'Пользователь'}
                    </span>
                  )}
                  <span>
                    <FiClock className="inline mr-1" size={12} />
                    {format(new Date(alert.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                  </span>
                  {alert.resolved_at && (
                    <span>
                      Решено: {format(new Date(alert.resolved_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                    </span>
                  )}
                </div>
              </div>
              {!alert.is_resolved && (
                <button onClick={() => handleResolveAlert(alert.id)} className="btn btn-primary btn-sm">
                  <FiCheckCircle className="mr-2" size={16} />
                  Решить
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
