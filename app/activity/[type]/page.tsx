'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { FixedSizeList as List } from 'react-window'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiArrowLeft, FiMessageCircle, FiHeart, FiBriefcase, FiStar, FiUsers, FiCornerDownRight } from 'react-icons/fi'

const ROW_HEIGHT = 88
const LIST_HEIGHT = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.6, 600) : 500

const TYPES = ['comments', 'likes', 'responses', 'reviews', 'followers', 'replies'] as const
const LABELS: Record<string, string> = {
  comments: 'Комментарии',
  likes: 'Лайки',
  responses: 'Отклики',
  reviews: 'Отзывы',
  followers: 'Подписчики',
  replies: 'Ответы',
}
const PERIODS = ['all', '1d', '7d', '30d'] as const
const PERIOD_LABELS: Record<string, string> = { 'all': 'Все', '1d': '1 день', '7d': '7 дней', '30d': 'Месяц' }

function formatDate (d: string) {
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export default function ActivityTypePage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const type = (params?.type as string) || ''
  const [items, setItems] = useState<{ id: string; title: string; subtitle: string; link: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [backing, setBacking] = useState(false)
  const [period, setPeriod] = useState<'all' | '1d' | '7d' | '30d'>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }
    if (user && user.role !== 'master' && user.role !== 'seller') {
      router.push('/')
      return
    }
    if (type === 'responses' && user?.role !== 'master') {
      router.push('/activity')
      return
    }
    if (!TYPES.includes(type as any)) {
      router.push('/activity')
      return
    }
    if (user) fetchItems(false)
  }, [user, authLoading, type, period, router])

  const fetchItems = async (append: boolean) => {
    if (!user) return
    if (!append) setLoading(true)
    else setLoadingMore(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) throw new Error('Not authenticated')
      const params = new URLSearchParams({
        type,
        period,
        limit: '20',
      })
      if (append && nextCursor) params.set('cursor', nextCursor)
      const res = await fetch(`/api/activity/items?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const list = data.items || []
      setHasMore(!!data.hasMore)
      setNextCursor(data.nextCursor ?? null)
      if (append) {
        setItems((prev) => [...prev, ...list])
      } else {
        setItems(list)
      }
    } catch (e) {
      console.error(e)
      if (!append) setItems([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) fetchItems(true)
  }

  const handleBack = async () => {
    setBacking(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (token) {
        await fetch('/api/activity/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ type }),
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setBacking(false)
    }
    router.push('/activity')
  }

  if (authLoading || !TYPES.includes(type as any)) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-bg-secondary pb-20 pt-20" />
      </>
    )
  }

  if (!user) return null
  if (type !== 'replies' && user.role !== 'master' && user.role !== 'seller') return null

  const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    comments: FiMessageCircle,
    likes: FiHeart,
    responses: FiBriefcase,
    reviews: FiStar,
    followers: FiUsers,
    replies: FiCornerDownRight,
  }
  const Icon = icons[type] || FiMessageCircle

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-bg-secondary pb-20 pt-20">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={backing}
              className="p-2 rounded-lg hover:bg-white/80 transition-colors text-graphite-secondary disabled:opacity-60"
              aria-label="Назад"
            >
              <FiArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg border border-border-light bg-white">
                <Icon size={20} className="text-graphite-secondary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-graphite-secondary">{LABELS[type] || type}</h1>
                {period !== 'all' && <p className="text-sm text-text-secondary">За {PERIOD_LABELS[period]}</p>}
              </div>
            </div>
          </div>

          {/* Фильтр по периоду */}
          <div className="flex gap-2 mb-4">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-graphite-secondary text-white'
                    : 'bg-white border border-border-light text-graphite-secondary hover:border-border-color/50'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-text-secondary py-12">Загрузка…</div>
          ) : items.length === 0 ? (
            <div className="bg-white border border-border-light rounded-lg p-8 text-center text-text-secondary">
              За выбранный период записей нет.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div style={{ height: LIST_HEIGHT }} className="w-full overflow-hidden rounded-lg">
                <List
                  width="100%"
                  height={LIST_HEIGHT}
                  itemCount={items.length}
                  itemSize={ROW_HEIGHT}
                  itemData={items}
                  onScroll={({ scrollOffset }) => {
                    const total = items.length * ROW_HEIGHT
                    if (total > 0 && scrollOffset + LIST_HEIGHT >= total - 300 && hasMore && !loadingMore) {
                      loadMore()
                    }
                  }}
                >
                  {({ index, style, data }) => {
                    const it = data[index]
                    if (!it) return <div style={style} />
                    return (
                      <div style={{ ...style, paddingBottom: 8 }} className="box-border">
                        <div className="bg-white border border-border-light rounded-lg p-4 hover:border-border-color/50 transition-colors h-full">
                          {(it as any).targetLabel && (
                            <div className="text-xs text-text-muted mb-1.5">{(it as any).targetLabel}</div>
                          )}
                          <Link href={it.link} className="block">
                            <div className="font-medium text-graphite-secondary mb-1">{it.title}</div>
                            {it.subtitle ? <div className="text-sm text-text-secondary mb-2 line-clamp-2">{it.subtitle}</div> : null}
                            <div className="text-xs text-text-muted">{formatDate(it.created_at)}</div>
                          </Link>
                          {(it as any).replyLink && (
                            <Link
                              href={(it as any).replyLink}
                              className="inline-flex items-center gap-1.5 text-xs text-brand-accent hover:underline mt-2"
                            >
                              <FiMessageCircle size={12} />
                              Ответить
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  }}
                </List>
              </div>
              {loadingMore && <div className="text-center text-sm text-text-secondary py-2">Загрузка…</div>}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
