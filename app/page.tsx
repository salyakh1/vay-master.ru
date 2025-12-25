'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './providers'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import AdBannerSlider from '@/components/AdBannerSlider'

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
      // Выполняем все запросы параллельно для ускорения
      const [
        { count: totalCount },
        { count: mastersCount },
        { count: sellersCount },
        { count: clientsCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'master'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
      ])

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
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-base text-text-secondary">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {user && <Navbar />}
      
      <div className="container mx-auto px-4 py-16">
        {/* Баннеры */}
        <div className="mb-8">
          <AdBannerSlider page="home" />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-semibold text-text-primary mb-6">
            VAY-MASTER
          </h1>
          <p className="text-2xl md:text-3xl font-medium text-text-primary mb-4">
            Найди своего мастера
          </p>
          <p className="text-base text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Единая платформа для мастеров, продавцов строительных материалов и клиентов. 
            Создавай портфолио, находи заказы, продавай инструменты и находи лучших специалистов.
          </p>
        </div>

        {/* Statistics Section */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-4xl font-semibold text-text-primary mb-2">
                {stats.totalUsers.toLocaleString('ru-RU')}
              </div>
              <div className="text-sm text-text-secondary font-normal">Пользователей</div>
            </div>
            <div className="card text-center">
              <div className="text-4xl font-semibold text-text-primary mb-2">
                {stats.masters.toLocaleString('ru-RU')}
              </div>
              <div className="text-sm text-text-secondary font-normal">Мастеров</div>
            </div>
            <div className="card text-center">
              <div className="text-4xl font-semibold text-text-primary mb-2">
                {stats.sellers.toLocaleString('ru-RU')}
              </div>
              <div className="text-sm text-text-secondary font-normal">Продавцов</div>
            </div>
            <div className="card text-center">
              <div className="text-4xl font-semibold text-text-primary mb-2">
                {stats.clients.toLocaleString('ru-RU')}
              </div>
              <div className="text-sm text-text-secondary font-normal">Клиентов</div>
            </div>
          </div>
        </div>

        {/* Auth Section - только для неавторизованных */}
        {!user && (
          <div className="max-w-md mx-auto card mb-16">
            <h2 className="text-xl font-semibold mb-6 text-center text-text-primary">
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
            <h3 className="text-xl font-semibold mb-3 text-text-primary">Мастера</h3>
            <p className="text-base text-text-secondary leading-relaxed mb-4">
              Создавай портфолио своих работ, делись опытом и находи заказы от клиентов. 
              Покажи свои навыки и получи признание.
            </p>
            <div className="text-sm font-normal text-text-secondary">
              {stats.masters} мастеров на платформе
            </div>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">🛒</div>
            <h3 className="text-xl font-semibold mb-3 text-text-primary">Продавцы</h3>
            <p className="text-base text-text-secondary leading-relaxed mb-4">
              Продавай инструменты и строительные материалы. 
              Создавай каталог товаров и находи покупателей в своем городе.
            </p>
            <div className="text-sm font-normal text-text-secondary">
              {stats.sellers} продавцов на платформе
            </div>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-xl font-semibold mb-3 text-text-primary">Клиенты</h3>
            <p className="text-base text-text-secondary leading-relaxed mb-4">
              Находи проверенных мастеров для своих задач. 
              Покупай инструменты и материалы у надежных продавцов.
            </p>
            <div className="text-sm font-normal text-text-secondary">
              {stats.clients} клиентов на платформе
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="max-w-4xl mx-auto card">
          <h2 className="text-xl font-semibold mb-8 text-center text-text-primary">
            О платформе
          </h2>
          <div className="space-y-6 text-text-secondary leading-relaxed">
            <p className="text-base">
              <strong className="text-text-primary">VAY-MASTER</strong> — это современная социальная сеть, 
              объединяющая мастеров, продавцов строительных материалов и клиентов в едином пространстве.
            </p>
            <p className="text-base">
              Наша миссия — сделать поиск специалистов и покупку материалов простым и удобным процессом. 
              Мы создаем сообщество профессионалов, где каждый может найти то, что ему нужно.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <div className="p-4 bg-bg-secondary rounded-lg">
                <div className="text-xl mb-2">✨</div>
                <div className="font-semibold mb-1 text-text-primary text-sm">Удобный поиск</div>
                <div className="text-xs text-text-secondary">Быстрый поиск мастеров и товаров по городу и специализации</div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg">
                <div className="text-xl mb-2">💬</div>
                <div className="font-semibold mb-1 text-text-primary text-sm">Прямое общение</div>
                <div className="text-xs text-text-secondary">Чат с мастерами и продавцами без посредников</div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg">
                <div className="text-xl mb-2">📱</div>
                <div className="font-semibold mb-1 text-text-primary text-sm">Социальная лента</div>
                <div className="text-xs text-text-secondary">Делитесь работами, находите вдохновение и общайтесь</div>
              </div>
              <div className="p-4 bg-bg-secondary rounded-lg">
                <div className="text-xl mb-2">🛡️</div>
                <div className="font-semibold mb-1 text-text-primary text-sm">Надежность</div>
                <div className="text-xs text-text-secondary">Проверенные профили и отзывы от реальных клиентов</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section - только для неавторизованных */}
        {!user && (
          <div className="max-w-2xl mx-auto mt-20 text-center">
            <h3 className="text-xl font-semibold text-text-primary mb-4">
              Готовы начать?
            </h3>
            <p className="text-base text-text-secondary mb-6">
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
