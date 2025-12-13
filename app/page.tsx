'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './providers'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

interface Stats {
  totalUsers: number
  masters: number
  sellers: number
  clients: number
}

export default function Home() {
  const { user, loading } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    masters: 0,
    sellers: 0,
    clients: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Получаем общее количество пользователей
      const { count: totalCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Получаем количество мастеров
      const { count: mastersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'master')

      // Получаем количество продавцов
      const { count: sellersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'seller')

      // Получаем количество клиентов
      const { count: clientsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client')

      setStats({
        totalUsers: totalCount || 0,
        masters: mastersCount || 0,
        sellers: sellersCount || 0,
        clients: clientsCount || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-lg text-gray-600">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {user && <Navbar />}
      
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
            VAY-MASTER
          </h1>
          <p className="text-3xl md:text-4xl font-bold text-black mb-4">
            Найди своего мастера
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Единая платформа для мастеров, продавцов строительных материалов и клиентов. 
            Создавай портфолио, находи заказы, продавай инструменты и находи лучших специалистов.
          </p>
        </div>

        {/* Statistics Section */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-4xl font-bold text-black mb-2">
                {stats.totalUsers.toLocaleString('ru-RU')}
              </div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Пользователей</div>
            </div>
            <div className="card text-center">
              <div className="text-4xl font-bold text-black mb-2">
                {stats.masters.toLocaleString('ru-RU')}
              </div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Мастеров</div>
            </div>
            <div className="card text-center">
              <div className="text-4xl font-bold text-black mb-2">
                {stats.sellers.toLocaleString('ru-RU')}
              </div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Продавцов</div>
            </div>
            <div className="card text-center">
              <div className="text-4xl font-bold text-black mb-2">
                {stats.clients.toLocaleString('ru-RU')}
              </div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Клиентов</div>
            </div>
          </div>
        </div>

        {/* Auth Section - только для неавторизованных */}
        {!user && (
          <div className="max-w-md mx-auto card mb-16">
            <h2 className="text-xl font-bold mb-6 text-center text-black">
              Добро пожаловать!
            </h2>
            <div className="space-y-4">
              <Link
                href="/auth/register"
                className="block w-full btn btn-primary text-center"
              >
                Зарегистрироваться
              </Link>
              <Link
                href="/auth/login"
                className="block w-full btn btn-outline text-center"
              >
                Войти
              </Link>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
          <div className="card text-center">
            <div className="text-4xl mb-4">🔨</div>
            <h3 className="text-xl font-bold mb-3 text-black">Мастера</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Создавай портфолио своих работ, делись опытом и находи заказы от клиентов. 
              Покажи свои навыки и получи признание.
            </p>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {stats.masters} мастеров на платформе
            </div>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">🛒</div>
            <h3 className="text-xl font-bold mb-3 text-black">Продавцы</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Продавай инструменты и строительные материалы. 
              Создавай каталог товаров и находи покупателей в своем городе.
            </p>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {stats.sellers} продавцов на платформе
            </div>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-xl font-bold mb-3 text-black">Клиенты</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Находи проверенных мастеров для своих задач. 
              Покупай инструменты и материалы у надежных продавцов.
            </p>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {stats.clients} клиентов на платформе
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="max-w-4xl mx-auto card">
          <h2 className="text-xl font-bold mb-8 text-center text-black">
            О платформе
          </h2>
          <div className="space-y-6 text-gray-600 leading-relaxed">
            <p className="text-base">
              <strong className="text-black">VAY-MASTER</strong> — это современная социальная сеть, 
              объединяющая мастеров, продавцов строительных материалов и клиентов в едином пространстве.
            </p>
            <p className="text-base">
              Наша миссия — сделать поиск специалистов и покупку материалов простым и удобным процессом. 
              Мы создаем сообщество профессионалов, где каждый может найти то, что ему нужно.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <div className="p-4 border border-gray-200">
                <div className="text-xl mb-2">✨</div>
                <div className="font-semibold mb-1 text-black text-sm">Удобный поиск</div>
                <div className="text-xs text-gray-500">Быстрый поиск мастеров и товаров по городу и специализации</div>
              </div>
              <div className="p-4 border border-gray-200">
                <div className="text-xl mb-2">💬</div>
                <div className="font-semibold mb-1 text-black text-sm">Прямое общение</div>
                <div className="text-xs text-gray-500">Чат с мастерами и продавцами без посредников</div>
              </div>
              <div className="p-4 border border-gray-200">
                <div className="text-xl mb-2">📱</div>
                <div className="font-semibold mb-1 text-black text-sm">Социальная лента</div>
                <div className="text-xs text-gray-500">Делитесь работами, находите вдохновение и общайтесь</div>
              </div>
              <div className="p-4 border border-gray-200">
                <div className="text-xl mb-2">🛡️</div>
                <div className="font-semibold mb-1 text-black text-sm">Надежность</div>
                <div className="text-xs text-gray-500">Проверенные профили и отзывы от реальных клиентов</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section - только для неавторизованных */}
        {!user && (
          <div className="max-w-2xl mx-auto mt-20 text-center">
            <h3 className="text-xl font-bold text-black mb-4">
              Готовы начать?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Присоединяйтесь к сообществу профессионалов уже сегодня
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/auth/register"
                className="btn btn-primary px-8"
              >
                Создать аккаунт
              </Link>
              <Link
                href="/auth/login"
                className="btn btn-outline px-8"
              >
                Войти
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

