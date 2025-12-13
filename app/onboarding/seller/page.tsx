'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, User } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import Navbar from '@/components/Navbar'

export default function SellerOnboardingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [profile, setProfile] = useState<User | null>(null)
  const [categorySection, setCategorySection] = useState('')
  const [storeAddress, setStoreAddress] = useState('')
  const [workHours, setWorkHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      const p = data as User
      setProfile(p)
      setCategorySection(p.product_categories || '')
      setStoreAddress(p.store_address || '')
      setWorkHours(p.work_hours || '')
    } catch (err) {
      console.error('Error loading profile', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!categorySection) {
      setError('Выберите категорию товаров')
      return
    }
    setError('')
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          product_categories: categorySection, // используем поле product_categories под основной раздел
          store_address: storeAddress || null,
          work_hours: workHours || null,
        })
        .eq('id', user.id)
      if (error) throw error
      router.push(`/profile/${user.id}`)
    } catch (err: any) {
      console.error('Error saving seller onboarding', err)
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  // Только для продавцов
  if (profile && profile.role !== 'seller') {
    router.push('/feed')
    return null
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-xl mx-auto card">
          <h1 className="text-2xl font-bold mb-4">Категория и магазин</h1>
          <p className="text-sm text-gray-600 mb-6">
            Выберите основную категорию товаров и укажите данные магазина. Это поможет покупателям
            понимать, что вы продаёте и как с вами связаться.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Категория товаров *
              </label>
              <select
                value={categorySection}
                onChange={(e) => setCategorySection(e.target.value)}
                required
                className="input"
              >
                <option value="">Выберите категорию</option>
                <option value="instruments">Инструменты</option>
                <option value="materials">Стройматериалы</option>
                <option value="autoparts">Автозапчасти</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Адрес магазина / склада
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Город, улица, дом, офис/склад"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Режим работы
              </label>
              <input
                type="text"
                value={workHours}
                onChange={(e) => setWorkHours(e.target.value)}
                placeholder="Например: Пн-Сб 09:00-19:00, Вс выходной"
                className="input"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary flex-1"
              >
                {saving ? 'Сохранение...' : 'Сохранить и продолжить'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/profile/${user.id}`)}
                className="btn btn-outline"
              >
                Пропустить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

