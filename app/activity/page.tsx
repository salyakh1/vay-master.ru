'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiMessageCircle, FiHeart, FiBriefcase, FiStar, FiUsers, FiArrowLeft, FiRefreshCw, FiCornerDownRight } from 'react-icons/fi'

interface ActivityStats {
  comments: number
  comments_new: number
  likes: number
  likes_new: number
  responses: number
  responses_new: number
  reviews: number
  reviews_new: number
  followers: number
  followers_new: number
  replies: number
  replies_new: number
}

export default function ActivityPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<ActivityStats>({
    comments: 0, comments_new: 0,
    likes: 0, likes_new: 0,
    responses: 0, responses_new: 0,
    reviews: 0, reviews_new: 0,
    followers: 0, followers_new: 0,
    replies: 0, replies_new: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }
    if (user) fetchStats()
  }, [user, authLoading, router])

  const fetchStats = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/activity/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats({
        comments: 0, comments_new: 0,
        likes: 0, likes_new: 0,
        responses: 0, responses_new: 0,
        reviews: 0, reviews_new: 0,
        followers: 0, followers_new: 0,
        replies: 0, replies_new: 0,
        ...data.stats,
      })
    } catch (error) {
      console.error('Error fetching activity stats:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStats()
  }

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary pb-20 pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-text-secondary">
              Загрузка статистики...
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!user) return null

  const statCards = [
    {
      id: 'comments',
      title: 'Комментарии',
      value: stats.comments,
      icon: FiMessageCircle,
      description: user.role === 'master' ? 'Комментарии к работам портфолио' : 'Комментарии к товарам',
    },
    {
      id: 'likes',
      title: 'Лайки',
      value: stats.likes,
      icon: FiHeart,
      description: user.role === 'master' ? 'Лайки работ портфолио' : 'Лайки товаров',
      showOnlyFor: ['master', 'seller'],
    },
    {
      id: 'responses',
      title: 'Отклики',
      value: stats.responses,
      icon: FiBriefcase,
      description: 'Отклики на заказы',
      showOnly: 'master' as const,
    },
    {
      id: 'reviews',
      title: 'Отзывы',
      value: stats.reviews,
      icon: FiStar,
      description: user.role === 'master' ? 'Отзывы о мастере' : 'Отзывы о продавце и товарах',
    },
    {
      id: 'followers',
      title: 'Подписки',
      value: stats.followers,
      icon: FiUsers,
      description: 'Количество подписчиков',
      showOnlyFor: ['master', 'seller'],
    },
    {
      id: 'replies',
      title: 'Ответы',
      value: stats.replies,
      icon: FiCornerDownRight,
      description: 'Ответы на ваши комментарии к товарам',
    },
  ]

  const filteredCards = statCards.filter((card: any) => {
    if (card.showOnly && card.showOnly !== user.role) return false
    if (card.showOnlyFor && !card.showOnlyFor.includes(user.role)) return false
    return true
  })

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-bg-secondary pb-20 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-bg-secondary transition-colors text-graphite-secondary"
              >
                <FiArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-graphite-secondary mb-1">
                  Активность
                </h1>
                <p className="text-sm text-text-secondary">
                  Статистика вашей активности на платформе
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-bg-secondary transition-colors text-graphite-secondary disabled:opacity-50"
              title="Обновить"
            >
              <FiRefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {filteredCards.map((card) => {
              const Icon = card.icon
              const newCount = (stats as any)[`${card.id}_new`] || 0
              return (
                <Link
                  key={card.id}
                  href={`/activity/${card.id}`}
                  className="block bg-white border border-border-light rounded-lg p-5 hover:border-border-color/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0 p-2.5 rounded-lg border border-border-light bg-bg-secondary/50">
                        <Icon size={20} className="text-graphite-secondary" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-graphite-secondary mb-0.5">
                          {card.title}
                        </h3>
                        <p className="text-xs text-text-secondary leading-snug">
                          {card.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <div className="text-2xl sm:text-3xl font-semibold tabular-nums text-graphite-secondary">
                        {card.value.toLocaleString('ru-RU')}
                      </div>
                      {newCount > 0 && (
                        <span className="text-xs font-medium text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded">
                          +{newCount} новых
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-white border border-border-light rounded-lg p-5">
            <h2 className="text-base font-semibold text-graphite-secondary mb-3">
              Что показывается здесь?
            </h2>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-graphite-secondary mt-0.5">—</span>
                <span><strong className="text-graphite-secondary">Комментарии:</strong> {user.role === 'master' ? 'Все комментарии к работам в портфолио' : 'Все комментарии к вашим товарам'}</span>
              </li>
              {user.role === 'master' && (
                <li className="flex items-start gap-2">
                  <span className="text-graphite-secondary mt-0.5">—</span>
                  <span><strong className="text-graphite-secondary">Лайки:</strong> Лайки работ в портфолио. По нажатию — только новые.</span>
                </li>
              )}
              {user.role === 'master' && (
                <li className="flex items-start gap-2">
                  <span className="text-graphite-secondary mt-0.5">—</span>
                  <span><strong className="text-graphite-secondary">Отклики:</strong> Ваши отклики на заказы. По нажатию — только новые.</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-graphite-secondary mt-0.5">—</span>
                <span><strong className="text-graphite-secondary">Отзывы:</strong> {user.role === 'master' ? 'Отзывы клиентов о вас' : 'Отзывы о вас и о ваших товарах'}. По нажатию — только новые.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-graphite-secondary mt-0.5">—</span>
                <span><strong className="text-graphite-secondary">Подписки:</strong> Подписчики вашего профиля. По нажатию — только новые.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-graphite-secondary mt-0.5">—</span>
                <span><strong className="text-graphite-secondary">Ответы:</strong> Ответы на ваши комментарии к товарам. По нажатию — переход к комментарию и кнопка «Ответить».</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
