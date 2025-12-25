'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase } from '@/lib/supabase'
import { logAdminAction, type SystemSetting } from '@/lib/admin'
import { FiSave, FiSettings, FiFlag, FiGlobe, FiZap } from 'react-icons/fi'

export default function AdminSettingsPage() {
  const { user: currentUser } = useAuth()
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('feature_flags')

  useEffect(() => {
    fetchSettings()
    if (currentUser) {
      logAdminAction(currentUser.id, 'view_settings', 'settings')
    }
  }, [currentUser, category])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', category)
        .order('key', { ascending: true })

      if (error) throw error
      setSettings((data || []) as SystemSetting[])
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSetting = async (settingId: string, value: any) => {
    if (!currentUser) return

    try {
      await supabase
        .from('system_settings')
        .update({
          value,
          updated_by: currentUser.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settingId)

      await logAdminAction(currentUser.id, 'update_setting', 'system_setting', settingId, { value })
      alert('Настройка сохранена')
      fetchSettings()
    } catch (error) {
      console.error('Error saving setting:', error)
      alert('Ошибка при сохранении настройки')
    }
  }

  const categories = [
    { value: 'feature_flags', label: 'Feature Flags', icon: FiFlag },
    { value: 'limits', label: 'Лимиты', icon: FiZap },
    { value: 'regions', label: 'Регионы', icon: FiGlobe },
    { value: 'ab_testing', label: 'A/B тестирование', icon: FiSettings },
    { value: 'system', label: 'Системные', icon: FiSettings },
  ]

  if (loading) {
    return <div className="text-text-secondary">Загрузка настроек...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Системные настройки</h1>
        <p className="text-text-secondary">Управление функциональностью, лимитами и системными параметрами</p>
      </div>

      {/* Category Tabs */}
      <div className="card">
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${
                  category === cat.value
                    ? 'bg-brand-accent text-white'
                    : 'bg-bg-secondary text-text-secondary hover:bg-bg-secondary/80'
                }`}
              >
                <Icon size={16} />
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Settings List */}
      <div className="space-y-4">
        {settings.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-text-secondary">Настройки в этой категории отсутствуют</p>
            <p className="text-sm text-text-muted mt-2">
              Настройки можно создавать через SQL запросы к таблице system_settings
            </p>
          </div>
        ) : (
          settings.map((setting) => (
            <div key={setting.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-1">{setting.key}</h3>
                  {setting.description && (
                    <p className="text-sm text-text-secondary mb-3">{setting.description}</p>
                  )}
                  <div className="text-xs text-text-muted">
                    Текущее значение: <code className="bg-bg-secondary px-2 py-1 rounded">
                      {typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value)}
                    </code>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newValue = prompt(
                      'Новое значение (JSON для объектов):',
                      typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value)
                    )
                    if (newValue !== null) {
                      try {
                        const parsedValue = JSON.parse(newValue)
                        handleSaveSetting(setting.id, parsedValue)
                      } catch {
                        handleSaveSetting(setting.id, newValue)
                      }
                    }
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <FiSave className="mr-2" size={16} />
                  Изменить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Как создавать настройки</h3>
        <p className="text-sm text-blue-800">
          Для создания новых настроек выполните SQL запрос к таблице system_settings в Supabase. Например:
        </p>
        <pre className="mt-2 p-3 bg-blue-100 rounded text-xs overflow-x-auto">
          {`INSERT INTO system_settings (key, value, description, category)
VALUES ('max_orders_per_user', '10', 'Максимальное количество заказов на пользователя', 'limits');`}
        </pre>
      </div>
    </div>
  )
}

