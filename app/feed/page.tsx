'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '../providers'
import { supabase, PortfolioItem, PortfolioComment } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import AdBannerSlider from '@/components/AdBannerSlider'
import Link from 'next/link'
import { FiHeart, FiMessageCircle, FiMessageSquare, FiMapPin } from 'react-icons/fi'
import StoriesCircle from '@/components/StoriesCircle'
import PostImageSlider from '@/components/PostImageSlider'
import { Story } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface ItemWithInteractions extends PortfolioItem {
  liked?: boolean
  comments?: PortfolioComment[]
  showComments?: boolean
}

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<ItemWithInteractions[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({})
  const [feedTab, setFeedTab] = useState<'all' | 'masters' | 'sellers'>('all')
  // Режим ленты: 'following' — только те, на кого подписан (как раньше);
  // 'explore' — вообще все публикации на платформе, аналог Explore в Instagram / «Новости» во VK
  const [feedMode, setFeedMode] = useState<'following' | 'explore'>('following')
  const [initialFeedModeResolved, setInitialFeedModeResolved] = useState(false)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

  const ITEMS_PER_PAGE = 9

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Новым пользователям без подписок сразу показываем «Рекомендации», а не пустые «Подписки»
  useEffect(() => {
    if (!user || initialFeedModeResolved) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .limit(1)
      if (cancelled) return
      if (!error && (!data || data.length === 0)) {
        setFeedMode('explore')
      }
      setInitialFeedModeResolved(true)
    })()
    return () => {
      cancelled = true
    }
  }, [user, initialFeedModeResolved])

  useEffect(() => {
    if (user && initialFeedModeResolved) {
      fetchItems(1, true)
    }
  }, [user, feedMode, initialFeedModeResolved])

  useEffect(() => {
    if (user) {
      fetchStories()
    }
  }, [user])

  // Обновляем истории при фокусе на странице (когда пользователь возвращается)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchStories()
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  // Подгрузка при прокрутке вниз (sentinel в конце ленты)
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current
    if (!sentinel || items.length === 0 || !hasMore || loadingMore) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '200px', threshold: 0 }
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [items.length, hasMore, loadingMore])

  const fetchItems = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
        setPage(1)
        setItems([])
        setHasMore(true)
      } else {
        setLoadingMore(true)
      }

      let followingIds: string[] = []

      if (feedMode === 'following') {
        const { data: subs, error: subsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user!.id)
        if (subsError) throw subsError
        followingIds = subs?.map((s) => s.following_id) || []

        if (followingIds.length === 0) {
          setItems([])
          setLoading(false)
          setLoadingMore(false)
          setHasMore(false)
          return
        }
      }

      const from = (pageNum - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      let query = supabase
        .from('portfolio_items')
        .select(`
          *,
          master:profiles(id, full_name, avatar_url, role, city)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      // В режиме «Подписки» показываем только тех, на кого подписан.
      // В режиме «Рекомендации» — все публикации платформы без ограничений (Explore-логика).
      if (feedMode === 'following') {
        query = query.in('master_id', followingIds)
      }

      const { data, error, count } = await query
      if (error) throw error
      
      const portfolioItems = (data as PortfolioItem[]) || []
      
      // Получаем данные о лайках и комментариях для всех работ
      if (portfolioItems.length > 0 && user) {
        const itemIds = portfolioItems.map(item => item.id)
        
        // Получаем лайки текущего пользователя
        const { data: likesData } = await supabase
          .from('portfolio_likes')
          .select('portfolio_item_id')
          .eq('user_id', user.id)
          .in('portfolio_item_id', itemIds)
        
        const likedItemIds = new Set(likesData?.map(l => l.portfolio_item_id) || [])
        
        // Получаем комментарии для всех работ (не более 60 на порцию — ~3 на пост)
        const { data: commentsData } = await supabase
          .from('portfolio_comments')
          .select(`
            *,
            user:profiles(id, full_name, avatar_url, role)
          `)
          .in('portfolio_item_id', itemIds)
          .order('created_at', { ascending: true })
          .limit(60)
        
        // Группируем комментарии по работам
        const commentsByItem = new Map<string, PortfolioComment[]>()
        commentsData?.forEach((comment: any) => {
          const itemId = comment.portfolio_item_id
          if (!commentsByItem.has(itemId)) {
            commentsByItem.set(itemId, [])
          }
          commentsByItem.get(itemId)!.push(comment as PortfolioComment)
        })
        
        // Объединяем данные
        const itemsWithInteractions: ItemWithInteractions[] = portfolioItems.map(item => ({
          ...item,
          liked: likedItemIds.has(item.id),
          comments: commentsByItem.get(item.id)?.slice(0, 3) || [], // Первые 3 комментария
          showComments: false,
        }))
        
        if (reset) {
          setItems(itemsWithInteractions)
        } else {
          setItems(prev => [...prev, ...itemsWithInteractions])
        }
      } else {
        const newItems = portfolioItems.map(item => ({
          ...item,
          liked: false,
          comments: [],
          showComments: false,
        }))
        
        if (reset) {
          setItems(newItems)
        } else {
          setItems(prev => [...prev, ...newItems])
        }
      }

      // Проверяем, есть ли ещё данные
      const totalFetched = reset ? portfolioItems.length : items.length + portfolioItems.length
      setHasMore(portfolioItems.length === ITEMS_PER_PAGE && (count || 0) > pageNum * ITEMS_PER_PAGE)
    } catch (error) {
      console.error('Error fetching portfolio items:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchItems(nextPage, false)
    }
  }

  const fetchStories = async () => {
    if (!user) return
    try {
      setStoriesLoading(true)
      const params = new URLSearchParams({
        page: 'feed',
        currentUserId: user.id,
      })
      const response = await fetch(`/api/stories?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch stories')
      }
      const data = await response.json()
      setStories(data.stories || [])
    } catch (error) {
      console.error('Error fetching stories:', error)
      setStories([])
    } finally {
      setStoriesLoading(false)
    }
  }

  const handleLike = async (itemId: string) => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    const item = items.find(i => i.id === itemId)
    if (!item) return

    try {
      if (item.liked) {
        const { error } = await supabase
          .from('portfolio_likes')
          .delete()
          .eq('portfolio_item_id', itemId)
          .eq('user_id', user.id)

        if (error) throw error
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, liked: false, likes_count: Math.max(0, i.likes_count - 1) }
              : i
          )
        )
      } else {
        const { error } = await supabase
          .from('portfolio_likes')
          .insert({
            portfolio_item_id: itemId,
            user_id: user.id,
          })

        if (error) throw error
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, liked: true, likes_count: i.likes_count + 1 } : i))
        )
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const setCommentsOpen = (itemId: string, open: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, showComments: open } : i)))
  }

  const fetchAllComments = async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('portfolio_comments')
        .select(`
          *,
          user:profiles(id, full_name, avatar_url, role)
        `)
        .eq('portfolio_item_id', itemId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, comments: (data as PortfolioComment[]) || [] } : i
        )
      )
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleSubmitComment = async (itemId: string) => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    const commentText = commentTexts[itemId]?.trim()
    if (!commentText) return

    setSubmittingComments({ ...submittingComments, [itemId]: true })
    try {
      const { error } = await supabase
        .from('portfolio_comments')
        .insert({
          portfolio_item_id: itemId,
          user_id: user.id,
          content: commentText,
        })

      if (error) throw error
      
      setCommentTexts({ ...commentTexts, [itemId]: '' })
      await fetchAllComments(itemId)
      
      // Обновляем счетчик комментариев
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, comments_count: (i.comments_count || 0) + 1, showComments: true } : i
        )
      )
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmittingComments({ ...submittingComments, [itemId]: false })
    }
  }

  if (authLoading || !initialFeedModeResolved || loading) {
    return (
      <div className="min-h-screen bg-bg-primary max-w-lg mx-auto">
        <div className="h-12 bg-white animate-pulse mb-3" />
        <div className="h-20 bg-white rounded-2xl mx-3 mb-3 animate-pulse" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 bg-white rounded-2xl mx-3 mb-3 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!user) return null

  const FEED_TABS = [
    { key: 'all' as const, label: 'Все' },
    { key: 'masters' as const, label: 'Мастера' },
    { key: 'sellers' as const, label: 'Продавцы' },
  ]

  const filteredItems = items.filter((item) => {
    const role = item.master?.role
    if (feedTab === 'masters') return role === 'master'
    if (feedTab === 'sellers') return role === 'seller'
    return true
  })

  return (
    <div className="min-h-screen bg-bg-primary max-w-lg mx-auto w-full pb-24">
      <Navbar />

      {/* Верхний переключатель: своя лента (подписки) vs общая лента платформы (Explore) */}
      <div className="flex bg-white border-b border-border-light">
        <button
          type="button"
          onClick={() => setFeedMode('following')}
          className={`flex-1 text-center py-3 text-[13px] font-bold border-b-2 transition-colors ${
            feedMode === 'following'
              ? 'border-brand-accent text-graphite-primary'
              : 'border-transparent text-text-secondary'
          }`}
        >
          Подписки
        </button>
        <button
          type="button"
          onClick={() => setFeedMode('explore')}
          className={`flex-1 text-center py-3 text-[13px] font-bold border-b-2 transition-colors ${
            feedMode === 'explore'
              ? 'border-brand-accent text-graphite-primary'
              : 'border-transparent text-text-secondary'
          }`}
        >
          Рекомендации
        </button>
      </div>

      {/* Панель историй — тёмная графитовая подложка, отделяет ленту от шапки */}
      {stories.length > 0 && (
        <div className="bg-graphite-primary px-4 py-3.5 overflow-x-auto">
          <StoriesCircle stories={stories} currentUser={user} isOwnProfile={false} onStoryCreated={fetchStories} />
        </div>
      )}

      {/* Сегментированный переключатель вместо подчёркнутых вкладок — фильтр по роли внутри выбранного режима */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex gap-1 bg-white rounded-full p-1 border border-border-light shadow-card">
          {FEED_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFeedTab(tab.key)}
              className={`flex-1 text-center py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                feedTab === tab.key
                  ? 'bg-brand-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-graphite-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full px-3 mt-2">
        <div className="rounded-2xl overflow-hidden">
          <AdBannerSlider page="feed" />
        </div>
      </div>

      <div className="px-3 pt-3 pb-4 flex flex-col gap-3">
        {filteredItems.length === 0 && !loading ? (
          <div className="bg-white rounded-2xl border border-border-light text-center text-text-secondary py-14 px-6 shadow-card">
            <div className="text-3xl mb-3" aria-hidden>
              📭
            </div>
            {feedMode === 'following' ? (
              <>
                <p className="text-[15px] font-bold text-graphite-primary mb-1.5">В подписках пока пусто</p>
                <p className="text-[12px] leading-relaxed text-text-secondary">
                  Подпишитесь на мастеров и продавцов — их работы появятся здесь
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-4 max-w-xs mx-auto">
                  <Link
                    href="/search"
                    className="bg-brand-accent text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Найти мастеров
                  </Link>
                  <button
                    type="button"
                    onClick={() => setFeedMode('explore')}
                    className="bg-bg-secondary text-graphite-primary text-xs font-bold px-4 py-2 rounded-xl border border-border-light"
                  >
                    Смотреть рекомендации
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[15px] font-bold text-graphite-primary mb-1.5">Пока нет публикаций</p>
                <p className="text-[12px] leading-relaxed text-text-secondary">
                  Как только мастера и продавцы начнут выкладывать работы, они появятся здесь
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {filteredItems.map((item) => {
              const isSeller = item.master?.role === 'seller'
              return (
                <article
                  key={item.id}
                  className="bg-white rounded-2xl border border-border-light shadow-card overflow-hidden"
                >
                  {/* Шапка карточки: аватар с цветным кольцом по роли, имя, роль, город, время */}
                  <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">
                    <Link
                      href={`/profile/${item.master?.id}`}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0 relative ring-2 ${
                        isSeller ? 'ring-[#2563eb]/40 bg-[#2563eb]' : 'ring-brand-accent/40 bg-brand-accent'
                      } text-white`}
                    >
                      {item.master?.avatar_url ? (
                        <Image src={item.master.avatar_url} alt="" fill className="object-cover" sizes="40px" />
                      ) : (
                        item.master?.full_name?.[0]?.toUpperCase() || 'M'
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/profile/${item.master?.id}`}
                          className="text-[13.5px] font-bold text-graphite-primary truncate hover:underline"
                        >
                          {item.master?.full_name || 'Мастер'}
                        </Link>
                        <span
                          className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                            isSeller ? 'bg-[#eef6ff] text-[#2563eb]' : 'bg-brand-accent/10 text-brand-accent'
                          }`}
                        >
                          {isSeller ? 'Продавец' : 'Мастер'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-text-secondary truncate mt-0.5">
                        {item.master?.city && (
                          <span className="flex items-center gap-0.5 truncate">
                            <FiMapPin size={10} className="flex-shrink-0" />
                            {item.master.city}
                          </span>
                        )}
                        {item.master?.city && <span aria-hidden>·</span>}
                        <span className="flex-shrink-0">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ru })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Заголовок и описание — текст важнее фото в этой карточке, читается первым */}
                  {(item.title || item.description) && (
                    <div className="px-4 pb-3">
                      {item.title && (
                        <h3 className="text-[14px] font-bold text-graphite-primary leading-snug mb-1">{item.title}</h3>
                      )}
                      {item.description && (
                        <p className="text-[13px] text-text-secondary leading-relaxed line-clamp-3">
                          {item.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Медиа — с отступами и скруглением, не во всю ширину карточки */}
                  {item.images && item.images.length > 0 ? (
                    <div className="px-4 pb-3.5">
                      <div className="h-[200px] rounded-xl overflow-hidden bg-bg-secondary">
                        <PostImageSlider
                          images={item.images}
                          alt={item.title}
                          className="w-full h-full [&_img]:!h-[200px] [&_img]:!object-cover"
                        />
                      </div>
                    </div>
                  ) : item.videos && item.videos.length > 0 ? (
                    <div className="px-4 pb-3.5">
                      <div className="h-[200px] rounded-xl overflow-hidden bg-bg-secondary">
                        <video src={item.videos[0]} controls className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ) : null}

                  {/* Действия — пилюли вместо голых иконок IG-стиля */}
                  <div className="flex items-center gap-2 px-4 pb-3.5">
                    <button
                      type="button"
                      onClick={() => handleLike(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                        item.liked
                          ? 'bg-brand-accent/10 border-brand-accent/30 text-brand-accent'
                          : 'bg-bg-secondary border-border-light text-text-secondary hover:border-brand-accent/30'
                      }`}
                    >
                      <FiHeart size={13} className={item.liked ? 'fill-current' : ''} />
                      {item.likes_count > 0 ? item.likes_count : 'Нравится'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextOpen = !item.showComments
                        setCommentsOpen(item.id, nextOpen)
                        if (nextOpen) fetchAllComments(item.id)
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                        item.showComments
                          ? 'bg-graphite-primary border-graphite-primary text-white'
                          : 'bg-bg-secondary border-border-light text-text-secondary hover:border-graphite-primary/30'
                      }`}
                    >
                      <FiMessageCircle size={13} />
                      {(item.comments_count ?? 0) > 0 ? item.comments_count : 'Комментарии'}
                    </button>
                    <Link
                      href={`/profile/${item.master?.id}`}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold text-text-secondary hover:text-brand-accent"
                    >
                      <FiMessageSquare size={13} />
                      Написать
                    </Link>
                  </div>

                  {/* Комментарии — раскрываются в отдельном блоке снизу карточки */}
                  {item.showComments && (
                    <div className="border-t border-border-light bg-bg-secondary/60 px-4 py-3">
                      {(item.comments ?? []).length === 0 ? (
                        <p className="text-[12px] text-text-secondary mb-2">Комментариев пока нет</p>
                      ) : (
                        <ul className="flex flex-col gap-2 mb-2.5">
                          {(item.comments ?? []).map((c) => (
                            <li key={c.id} className="flex items-start gap-2">
                              <span className="w-6 h-6 rounded-full bg-graphite-tertiary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                {c.user?.full_name?.[0]?.toUpperCase() || '?'}
                              </span>
                              <span className="text-[12px] text-graphite-primary leading-snug">
                                <span className="font-semibold mr-1">{c.user?.full_name || 'Пользователь'}</span>
                                {c.content}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={commentTexts[item.id] || ''}
                          onChange={(e) => setCommentTexts({ ...commentTexts, [item.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmitComment(item.id)
                          }}
                          placeholder="Написать комментарий…"
                          className="flex-1 bg-white border border-border-light rounded-full px-3.5 py-2 text-[12px] outline-none focus:border-brand-accent/40 min-w-0"
                        />
                        <button
                          type="button"
                          disabled={!commentTexts[item.id]?.trim() || submittingComments[item.id]}
                          onClick={() => handleSubmitComment(item.id)}
                          className="flex-shrink-0 bg-brand-accent text-white text-[11px] font-bold px-3.5 py-2 rounded-full disabled:opacity-40"
                        >
                          {submittingComments[item.id] ? '…' : 'Отправить'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
            <div ref={loadMoreSentinelRef} className="h-2 w-full" aria-hidden />
            {loadingMore && <div className="text-center text-xs text-text-secondary py-2">Загрузка…</div>}
          </>
        )}
      </div>
    </div>
  )
}

