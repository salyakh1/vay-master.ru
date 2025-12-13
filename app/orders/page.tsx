'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase, Order } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import OrderCard from '@/components/OrderCard'
import Link from 'next/link'
import { FiSearch, FiPlus, FiFilter, FiList, FiMap } from 'react-icons/fi'

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
  'Новый',
  'В работе',
  'Выполнен',
  'Отменен',
]

const statusMap: Record<string, string> = {
  'Новый': 'new',
  'В работе': 'in_progress',
  'Выполнен': 'completed',
  'Отменен': 'cancelled',
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Все категории')
  const [selectedStatus, setSelectedStatus] = useState('Все статусы')
  const [selectedCity, setSelectedCity] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user, searchQuery, selectedCategory, selectedStatus, selectedCity])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('orders')
        .select(`*, client:profiles!client_id(id, full_name, avatar_url, city, phone)`)
        .order('created_at', { ascending: false })

      // Поиск
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      // Фильтр по категории
      if (selectedCategory !== 'Все категории') {
        query = query.eq('category', selectedCategory)
      }

      // Фильтр по статусу
      if (selectedStatus !== 'Все статусы') {
        query = query.eq('status', statusMap[selectedStatus])
      }

      // Фильтр по городу
      if (selectedCity) {
        query = query.ilike('city', `%${selectedCity}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-28 flex items-center justify-center">
        <div className="text-lg text-gray-600">Загрузка...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Заказы</h1>
              <p className="text-gray-600">Найдите подходящий заказ или создайте свой</p>
            </div>
            <Link
              href="/orders/new"
              className="btn btn-primary flex items-center gap-2"
            >
              <FiPlus size={20} />
              <span>Создать заказ</span>
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="card mb-6 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-500" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Какой заказ ищете?"
                  className="input pl-12"
                />
              </div>
              <input
                type="text"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                placeholder="Город"
                className="input md:w-48"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input md:w-48"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input md:w-48"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-2 mb-6 bg-white/50 backdrop-blur-lg rounded-2xl p-2 border border-gray-200/50 w-fit">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <FiList size={18} />
              Список
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                viewMode === 'map'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <FiMap size={18} />
              Карта
            </button>
          </div>

          {/* Orders List */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="card text-center py-12">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-base font-medium text-black mb-2">
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
                orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          )}

          {/* Map View - Placeholder */}
          {viewMode === 'map' && (
            <div className="card text-center py-12">
              <div className="text-4xl mb-4">🗺️</div>
              <p className="text-base font-medium text-black mb-2">
                Карта заказов
              </p>
              <p className="text-sm text-gray-500">
                Функция карты будет добавлена в следующей версии
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

