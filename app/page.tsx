'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './providers'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import AdBannerSlider from '@/components/AdBannerSlider'
import { 
  FiSearch, 
  FiUser, 
  FiShoppingBag, 
  FiCheckCircle, 
  FiShield, 
  FiStar,
  FiTrendingUp,
  FiUsers,
  FiBriefcase,
  FiPackage,
  FiFileText,
  FiTarget,
  FiAlertCircle,
  FiMessageSquare,
  FiBarChart2,
  FiLock,
  FiEye,
  FiThumbsUp,
  FiLogIn
} from 'react-icons/fi'

interface Stats {
  totalUsers: number
  masters: number
  sellers: number
  clients: number
  completedOrders: number
}

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    masters: 0,
    sellers: 0,
    clients: 0,
    completedOrders: 0,
  })
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsFetched, setStatsFetched] = useState(false)
  const statsSectionRef = useRef<HTMLElement>(null)
  const [quickQuery, setQuickQuery] = useState('')

  const quickCategories = [
    { label: 'Инструменты', query: 'инструменты' },
    { label: 'Материалы', query: 'материалы' },
    { label: 'Мебель', query: 'мебель' },
    { label: 'Автозапчасти', query: 'автозапчасти' },
  ]

  const handleQuickSearch = () => {
    const query = quickQuery.trim()
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : '/products')
  }

  // Intersection Observer для ленивой загрузки статистики
  useEffect(() => {
    if (statsFetched || !statsSectionRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !statsFetched) {
            setStatsFetched(true)
            fetchStats()
            observer.disconnect()
          }
        })
      },
      { rootMargin: '200px' } // Загружаем за 200px до появления секции
    )

    observer.observe(statsSectionRef.current)

    return () => {
      observer.disconnect()
    }
  }, [statsFetched])

  const fetchStats = async () => {
    if (statsLoading) return // Предотвращаем повторные запросы
    
    try {
      setStatsLoading(true)
      
      // Выполняем все запросы параллельно для ускорения
      const [
        { count: totalCount },
        { count: mastersCount },
        { count: sellersCount },
        { count: clientsCount },
        { count: completedOrdersCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'master'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      ])

      setStats({
        totalUsers: totalCount || 0,
        masters: mastersCount || 0,
        sellers: sellersCount || 0,
        clients: clientsCount || 0,
        completedOrders: completedOrdersCount || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-base text-text-secondary">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      {user && <Navbar />}
      
      {/* Баннеры без отступов по бокам */}
      <div className="w-full mb-12 pt-8">
        <AdBannerSlider page="home" />
      </div>
      
      <div className="container mx-auto px-4">

        {/* 1. HERO-БЛОК */}
        <section className="max-w-4xl mx-auto text-center mb-24 pt-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-graphite-secondary mb-6 tracking-tight">
            VAY-MASTER — платформа профессионалов
          </h1>
          <p className="text-xl md:text-2xl font-medium text-text-secondary mb-8 leading-relaxed max-w-3xl mx-auto">
            Мастера, материалы и клиенты — в одном сервисе.
            <br />
            Найдите специалиста, закажите работы и материалы без лишних рисков.
          </p>
          
          {!user ? (
            <>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Link
                  href="/auth/register"
                  className="btn btn-primary px-8 flex items-center justify-center gap-2"
                >
                  <FiUser size={20} strokeWidth={2.5} />
                  Регистрироваться
                </Link>
                <Link
                  href="/auth/login"
                  className="btn btn-outline px-8 flex items-center justify-center gap-2"
                >
                  <FiLogIn size={20} strokeWidth={2.5} />
                  Войти
                </Link>
              </div>
              
              <p className="text-sm text-text-muted">
                Сервис бесплатен для клиентов
              </p>
            </>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-xl md:text-2xl font-medium text-text-secondary mb-6">
                  Добро пожаловать, {user.full_name || 'Пользователь'}! 👋
          </p>
        </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                {user.role === 'client' && (
                  <>
                    <Link
                      href="/search"
                      className="btn btn-primary px-8 flex items-center justify-center gap-2"
                    >
                      <FiSearch size={20} strokeWidth={2.5} />
                      Найти мастера
                    </Link>
                    <Link
                      href="/orders"
                      className="btn btn-outline px-8 flex items-center justify-center gap-2"
                    >
                      <FiBriefcase size={20} strokeWidth={2.5} />
                      Создать заказ
                    </Link>
                    <Link
                      href="/products"
                      className="btn btn-outline px-8 flex items-center justify-center gap-2"
                    >
                      <FiShoppingBag size={20} strokeWidth={2.5} />
                      Каталог товаров
                    </Link>
                  </>
                )}
                
                {user.role === 'master' && (
                  <>
                    <Link
                      href="/orders"
                      className="btn btn-primary px-8 flex items-center justify-center gap-2"
                    >
                      <FiBriefcase size={20} strokeWidth={2.5} />
                      Найти заказы
                    </Link>
                    <Link
                      href={`/profile/${user.id}`}
                      className="btn btn-outline px-8 flex items-center justify-center gap-2"
                    >
                      <FiUser size={20} strokeWidth={2.5} />
                      Мой профиль
                    </Link>
                    <Link
                      href="/portfolio/new"
                      className="btn btn-outline px-8 flex items-center justify-center gap-2"
                    >
                      <FiPackage size={20} strokeWidth={2.5} />
                      Добавить работу
                    </Link>
                  </>
                )}
                
                {user.role === 'seller' && (
                  <>
                    <Link
                      href="/products/new"
                      className="btn btn-primary px-8 flex items-center justify-center gap-2"
                    >
                      <FiShoppingBag size={20} strokeWidth={2.5} />
                      Разместить товар
                    </Link>
                    <Link
                      href="/products"
                      className="btn btn-outline px-8 flex items-center justify-center gap-2"
                    >
                      <FiPackage size={20} strokeWidth={2.5} />
                      Мои товары
                    </Link>
                    <Link
                      href={`/profile/${user.id}`}
                      className="btn btn-outline px-8 flex items-center justify-center gap-2"
                    >
                      <FiUser size={20} strokeWidth={2.5} />
                      Мой профиль
                    </Link>
                  </>
                )}
              </div>

              {(user.role === 'client') && (
                <div className="max-w-2xl mx-auto w-full mt-4">
                  <div className="flex items-center gap-3 bg-white border border-border-light rounded-2xl px-4 py-3 shadow-sm">
                    <FiSearch size={18} className="text-text-muted" />
                    <input
                      value={quickQuery}
                      onChange={(e) => setQuickQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickSearch()
                      }}
                      placeholder="Поиск товаров, материалов или услуг..."
                      className="flex-1 text-sm md:text-base bg-transparent focus:outline-none text-graphite-secondary"
                    />
                    <button
                      type="button"
                      onClick={handleQuickSearch}
                      className="px-4 py-2 text-sm font-semibold rounded-xl bg-brand-accent text-white hover:bg-brand-accent-hover transition-colors"
                    >
                      Найти
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {quickCategories.map((cat) => (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => router.push(`/products?q=${encodeURIComponent(cat.query)}`)}
                        className="px-3 py-1.5 text-xs md:text-sm rounded-full border border-border-light text-graphite-secondary hover:bg-bg-secondary transition-colors"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* 2. БЛОК "ДЛЯ КОГО VAY-MASTER" */}
        <section className="max-w-7xl mx-auto mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-graphite-secondary mb-4 tracking-tight">
              Для кого VAY-MASTER
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Профессиональная экосистема для всех участников строительного рынка
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Для мастеров */}
            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiBriefcase size={32} className="text-brand-accent" strokeWidth={2} />
            </div>
                <h3 className="text-2xl font-semibold text-graphite-secondary tracking-tight">
                  Для мастеров
                </h3>
              </div>
              <ul className="space-y-4 text-text-secondary leading-relaxed">
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Поиск реальных клиентов с конкретными задачами</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Портфолио работ для демонстрации опыта</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Заказы без посредников и комиссий</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Рейтинги и отзывы для повышения доверия</span>
                </li>
              </ul>
            </div>

            {/* Для продавцов */}
            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiPackage size={32} className="text-brand-accent" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-semibold text-graphite-secondary tracking-tight">
                  Для продавцов
                </h3>
              </div>
              <ul className="space-y-4 text-text-secondary leading-relaxed">
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Продажа инструментов и материалов напрямую</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Аудитория, уже связанная со стройкой</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Реклама и продвижение товаров в каталоге</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Прямой контакт с покупателями в чате</span>
                </li>
              </ul>
            </div>

            {/* Для клиентов */}
            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiUsers size={32} className="text-brand-accent" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-semibold text-graphite-secondary tracking-tight">
                  Для клиентов
                </h3>
              </div>
              <ul className="space-y-4 text-text-secondary leading-relaxed">
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Проверенные мастера с отзывами</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Понимание этапов работ и сроков</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Подбор специалистов под конкретную задачу</span>
                </li>
                <li className="flex items-start gap-3">
                  <FiCheckCircle size={20} className="text-brand-accent mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-medium">Экономия времени и денег без переплат</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. БЛОК "КАК РАБОТАЕТ VAY-MASTER" */}
        <section className="max-w-6xl mx-auto mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-graphite-secondary mb-4 tracking-tight">
              Как работает VAY-MASTER
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Простой путь от задачи до результата в 5 шагов
            </p>
          </div>
          <div className="space-y-6">
            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-brand-accent text-white rounded-lg flex items-center justify-center font-bold text-2xl shadow-lg">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-3 tracking-tight">
                    Пользователь описывает задачу
                  </h3>
                  <p className="text-base text-text-secondary leading-relaxed mb-2">
                    Строительство дома, ремонт квартиры, демонтаж и т.д. Подробное описание помогает найти нужного специалиста.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-3 py-1 bg-bg-secondary text-text-secondary text-sm rounded-md">Строительство</span>
                    <span className="px-3 py-1 bg-bg-secondary text-text-secondary text-sm rounded-md">Ремонт</span>
                    <span className="px-3 py-1 bg-bg-secondary text-text-secondary text-sm rounded-md">Демонтаж</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-brand-accent text-white rounded-lg flex items-center justify-center font-bold text-2xl shadow-lg">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-3 tracking-tight">
                    Платформа подсказывает, какие специалисты нужны
                  </h3>
                  <p className="text-base text-text-secondary leading-relaxed mb-2">
                    Система анализирует задачу и рекомендует подходящих мастеров по специализациям.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-3 py-1 bg-bg-secondary text-text-secondary text-sm rounded-md">Каменщики</span>
                    <span className="px-3 py-1 bg-bg-secondary text-text-secondary text-sm rounded-md">Бетонщики</span>
                    <span className="px-3 py-1 bg-bg-secondary text-text-secondary text-sm rounded-md">Электрики</span>
                    <span className="px-3 py-1 bg-bg-secondary text-text-secondary text-sm rounded-md">Сантехники</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-brand-accent text-white rounded-lg flex items-center justify-center font-bold text-2xl shadow-lg">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-3 tracking-tight">
                    Пользователь выбирает мастеров
                  </h3>
                  <p className="text-base text-text-secondary leading-relaxed mb-2">
                    Сравнение профилей, просмотр портфолио, изучение отзывов и рейтингов для принятия решения.
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <FiStar size={16} className="text-brand-accent" fill="currentColor" />
                      <span className="text-sm text-text-secondary font-medium">Рейтинг</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiThumbsUp size={16} className="text-brand-accent" />
                      <span className="text-sm text-text-secondary font-medium">Отзывы</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiBriefcase size={16} className="text-brand-accent" />
                      <span className="text-sm text-text-secondary font-medium">Портфолио</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-brand-accent text-white rounded-lg flex items-center justify-center font-bold text-2xl shadow-lg">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-3 tracking-tight">
                    Подбор материалов и продавцов
                  </h3>
                  <p className="text-base text-text-secondary leading-relaxed mb-2">
                    Встроенный каталог товаров позволяет найти нужные материалы и связаться с продавцами прямо в сервисе.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <FiShoppingBag size={18} className="text-brand-accent" />
                    <span className="text-sm text-text-secondary font-medium">Каталог товаров</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-16 h-16 bg-brand-accent text-white rounded-lg flex items-center justify-center font-bold text-2xl shadow-lg">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-3 tracking-tight">
                    Выполнение работ и отзыв
                  </h3>
                  <p className="text-base text-text-secondary leading-relaxed mb-2">
                    После завершения проекта клиент оставляет отзыв, что помогает другим пользователям в выборе.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <FiMessageSquare size={18} className="text-brand-accent" />
                    <span className="text-sm text-text-secondary font-medium">Обратная связь</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. БЛОК "КАКИЕ ПРОБЛЕМЫ МЫ РЕШАЕМ" */}
        <section className="max-w-6xl mx-auto mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-graphite-secondary mb-4 tracking-tight">
              Какие проблемы мы решаем
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Реальные решения для реальных проблем
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card hover:shadow-card-hover transition-all border-l-4 border-brand-accent">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <FiAlertCircle size={24} className="text-brand-accent" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-2 tracking-tight">
                    Не знаю, с чего начать стройку
                  </h3>
                  <p className="text-text-secondary leading-relaxed mb-3">
                    VAY-MASTER подсказывает этапы работ и необходимых специалистов
                  </p>
                  <div className="flex items-center gap-2 text-brand-accent font-medium">
                    <span>Решение</span>
                    <FiTarget size={18} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-card-hover transition-all border-l-4 border-brand-accent">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <FiShield size={24} className="text-brand-accent" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-2 tracking-tight">
                    Страх обмана
                  </h3>
                  <p className="text-text-secondary leading-relaxed mb-3">
                    Система отзывов, рейтингов и жалоб обеспечивает безопасность сделок
                  </p>
                  <div className="flex items-center gap-2 text-brand-accent font-medium">
                    <span>Защита</span>
                    <FiLock size={18} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card hover:shadow-card-hover transition-all border-l-4 border-brand-accent">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <FiSearch size={24} className="text-brand-accent" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-2 tracking-tight">
                    Сложно найти нормального мастера
                  </h3>
                  <p className="text-text-secondary leading-relaxed mb-3">
                    Проверенные профили с портфолио и реальными отзывами клиентов
                  </p>
                  <div className="flex items-center gap-2 text-brand-accent font-medium">
                    <span>Поиск</span>
                    <FiEye size={18} strokeWidth={2.5} />
                  </div>
                </div>
            </div>
          </div>
          
            <div className="card hover:shadow-card-hover transition-all border-l-4 border-brand-accent">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <FiShoppingBag size={24} className="text-brand-accent" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-2 tracking-tight">
                    Купил не те материалы
                  </h3>
                  <p className="text-text-secondary leading-relaxed mb-3">
                    Рекомендации специалистов и каталог проверенных продавцов
                  </p>
                  <div className="flex items-center gap-2 text-brand-accent font-medium">
                    <span>Каталог</span>
                    <FiPackage size={18} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. БЛОК ДОВЕРИЯ И БЕЗОПАСНОСТИ */}
        <section className="max-w-6xl mx-auto mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-graphite-secondary mb-4 tracking-tight">
              Почему VAY-MASTER — безопасно
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Многоуровневая система защиты для вашего спокойствия
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiShield size={28} className="text-brand-accent" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-3 tracking-tight">
                    Модерация мастеров и продавцов
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    Все профили проверяются администрацией перед публикацией. Проверка документов и портфолио.
                  </p>
                </div>
              </div>
            </div>
            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiAlertCircle size={28} className="text-brand-accent" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-3 tracking-tight">
                    Система жалоб
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    Быстрое реагирование на нарушения. Каждая жалоба рассматривается администрацией в течение 24 часов.
                  </p>
                </div>
              </div>
            </div>
            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiStar size={28} className="text-brand-accent" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-3 tracking-tight">
                    Реальные отзывы
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    Только от пользователей, выполнивших заказы. Невозможно оставить отзыв без завершённого проекта.
                  </p>
                </div>
              </div>
            </div>
            <div className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiUsers size={28} className="text-brand-accent" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-graphite-secondary mb-3 tracking-tight">
                    Администрация платформы
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    Контроль процессов и поддержка пользователей. Всегда на связи для решения вопросов.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. БЛОК СТАТИСТИКИ - Загружается только при появлении в viewport */}
        <section ref={statsSectionRef} className="max-w-6xl mx-auto mb-32">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-semibold text-graphite-secondary mb-4 tracking-tight">
              VAY-MASTER в цифрах
          </h2>
            <p className="text-lg text-text-secondary">
              Растущее сообщество профессионалов
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="card text-center hover:shadow-card-hover transition-all">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiUsers size={32} className="text-brand-accent" strokeWidth={2} />
                </div>
              </div>
              <div className="text-4xl md:text-5xl font-bold text-graphite-secondary mb-3 tracking-tight">
                {statsLoading ? '...' : stats.totalUsers.toLocaleString('ru-RU')}
              </div>
              <div className="text-base text-text-secondary font-semibold">Пользователей</div>
            </div>
            <div className="card text-center hover:shadow-card-hover transition-all">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiBriefcase size={32} className="text-brand-accent" strokeWidth={2} />
                </div>
              </div>
              <div className="text-4xl md:text-5xl font-bold text-graphite-secondary mb-3 tracking-tight">
                {statsLoading ? '...' : stats.masters.toLocaleString('ru-RU')}
              </div>
              <div className="text-base text-text-secondary font-semibold">Мастеров</div>
            </div>
            <div className="card text-center hover:shadow-card-hover transition-all">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiPackage size={32} className="text-brand-accent" strokeWidth={2} />
                </div>
              </div>
              <div className="text-4xl md:text-5xl font-bold text-graphite-secondary mb-3 tracking-tight">
                {statsLoading ? '...' : stats.sellers.toLocaleString('ru-RU')}
              </div>
              <div className="text-base text-text-secondary font-semibold">Продавцов</div>
            </div>
            <div className="card text-center hover:shadow-card-hover transition-all">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-brand-accent/10 rounded-lg flex items-center justify-center">
                  <FiCheckCircle size={32} className="text-brand-accent" strokeWidth={2} />
                </div>
              </div>
              <div className="text-4xl md:text-5xl font-bold text-graphite-secondary mb-3 tracking-tight">
                {statsLoading ? '...' : stats.completedOrders.toLocaleString('ru-RU')}
              </div>
              <div className="text-base text-text-secondary font-semibold">Выполненных заказов</div>
            </div>
          </div>
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-bg-secondary border border-border-light rounded-md">
              <FiTrendingUp size={20} className="text-brand-accent" strokeWidth={2.5} />
              <span className="text-base font-semibold text-graphite-secondary">
                Платформа растёт каждый день
              </span>
          </div>
        </div>
        </section>

        {/* 7. БЛОК ПРИЗЫВА К ДЕЙСТВИЮ */}
        {!user && (
          <section className="max-w-4xl mx-auto mb-24">
            <div className="card text-center bg-gradient-to-br from-bg-card to-bg-secondary border-2 border-brand-accent/20">
              <div className="mb-8">
                <h2 className="text-4xl md:text-5xl font-semibold text-graphite-secondary mb-4 tracking-tight">
                  Начните прямо сейчас
                </h2>
                <p className="text-lg text-text-secondary max-w-2xl mx-auto">
                  Присоединяйтесь к сообществу профессионалов и начните работать уже сегодня
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Link
                  href="/search"
                  className="btn btn-primary px-10 py-4 text-lg font-semibold flex items-center justify-center gap-2"
                >
                  <FiSearch size={22} strokeWidth={2.5} />
                  Найти мастера
                </Link>
              <Link
                href="/auth/register"
                  className="btn btn-outline px-10 py-4 text-lg font-semibold flex items-center justify-center gap-2"
              >
                  <FiUser size={22} strokeWidth={2.5} />
                  Зарегистрироваться
              </Link>
              <Link
                  href="/products"
                  className="btn btn-outline px-10 py-4 text-lg font-semibold flex items-center justify-center gap-2"
              >
                  <FiShoppingBag size={22} strokeWidth={2.5} />
                  Разместить товар
              </Link>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-text-muted">
                <div className="flex items-center gap-2">
                  <FiCheckCircle size={16} className="text-brand-accent" />
                  <span>Бесплатная регистрация</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle size={16} className="text-brand-accent" />
                  <span>Без скрытых платежей</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle size={16} className="text-brand-accent" />
                  <span>Поддержка 24/7</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
