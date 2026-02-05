'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FixedSizeList as List } from 'react-window'
import { useAuth } from '../providers'
import { supabase, PortfolioItem, PortfolioComment } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import AdBannerSlider from '@/components/AdBannerSlider'
import { FiGlobe, FiHeart, FiMessageCircle, FiSend } from 'react-icons/fi'
import StoriesCircle from '@/components/StoriesCircle'
import PostImageSlider from '@/components/PostImageSlider'
import { Story } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const FEED_LIST_HEIGHT = typeof window !== 'undefined' ? Math.min(700, window.innerHeight - 280) : 600
const FEED_ITEM_HEIGHT = 520

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
  const feedListRef = useRef<HTMLDivElement>(null)
  const [feedListWidth, setFeedListWidth] = useState(400)

  useEffect(() => {
    const el = feedListRef.current
    if (!el) return
    const setW = () => setFeedListWidth(el.offsetWidth)
    setW()
    const ro = new ResizeObserver(setW)
    ro.observe(el)
    return () => ro.disconnect()
  }, [items.length])

  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchItems(1, true)
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

      const { data: subs, error: subsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user!.id)
      if (subsError) throw subsError
      const followingIds = subs?.map((s) => s.following_id) || []

      if (followingIds.length === 0) {
        setItems([])
        setLoading(false)
        setLoadingMore(false)
        setHasMore(false)
        return
      }

      const from = (pageNum - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      let query = supabase
        .from('portfolio_items')
        .select(`
          *,
          master:profiles(id, full_name, avatar_url, role, city)
        `, { count: 'exact' })
        .in('master_id', followingIds)
        .order('created_at', { ascending: false })
        .range(from, to)

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
      console.log('Fetching stories for feed page with userId:', user.id)
      const response = await fetch(`/api/stories?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch stories')
      }
      const data = await response.json()
      console.log('Stories fetched for feed:', data.stories?.length || 0, 'stories')
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      {/* Баннеры без отступов по бокам */}
      <div className="w-full mb-6">
        <AdBannerSlider page="feed" />
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">

          <div className="flex justify-end mb-4">
            <button
              onClick={() => router.push('/feed/publications')}
              className="flex items-center gap-2 px-4 py-2 border border-border-color rounded-lg hover:bg-bg-secondary transition-colors text-sm text-text-secondary hover:text-text-primary"
              title="Все публикации и товары"
            >
              <FiGlobe size={18} />
              <span>Все публикации</span>
            </button>
          </div>

          {/* Истории подписок */}
          {storiesLoading ? (
            <div className="mb-6 text-center py-4 text-text-secondary">Загрузка историй...</div>
          ) : stories.length > 0 ? (
            <div className="mb-6">
              <StoriesCircle
                stories={stories}
                currentUser={user}
                isOwnProfile={false}
                onStoryCreated={fetchStories}
              />
            </div>
          ) : null}

          <div className="space-y-7 mt-6">
            {items.length === 0 && !loading ? (
              <div className="card text-center text-text-secondary py-12 animate-fade-in">
                <p className="text-lg font-medium text-graphite-secondary">Пока нет работ от ваших подписок.</p>
              </div>
            ) : items.length > 0 ? (
              <>
                <div ref={feedListRef} style={{ height: FEED_LIST_HEIGHT }} className="w-full overflow-hidden">
                  <List
                    width={feedListWidth}
                    height={FEED_LIST_HEIGHT}
                    itemCount={items.length}
                    itemSize={FEED_ITEM_HEIGHT}
                    itemData={{
                      items,
                      handleLike,
                      setCommentsOpen,
                      fetchAllComments,
                      commentTexts,
                      setCommentTexts,
                      submittingComments,
                      handleSubmitComment,
                      user,
                    }}
                    onScroll={({ scrollOffset }) => {
                      const total = items.length * FEED_ITEM_HEIGHT
                      if (total > 0 && scrollOffset + FEED_LIST_HEIGHT >= total - 400 && hasMore && !loadingMore) {
                        loadMore()
                      }
                    }}
                  >
                    {({ index, style, data }) => {
                      const item = data.items[index]
                      if (!item) return <div style={style} />
                      return (
                        <div style={{ ...style, paddingBottom: 28 }} className="box-border w-full">
                          <div className="bg-bg-card rounded-lg border border-border-light/40 overflow-hidden">
                            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-graphite-primary text-white flex items-center justify-center text-sm font-semibold rounded-full flex-shrink-0 relative overflow-hidden">
                                  {item.master?.avatar_url ? (
                                    <Image src={item.master.avatar_url} alt={item.master.full_name} fill className="object-cover" sizes="48px" />
                                  ) : (
                                    item.master?.full_name?.[0]?.toUpperCase() || 'M'
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-base text-graphite-secondary truncate">{item.master?.full_name || 'Мастер'}</div>
                                  {item.master?.city && (
                                    <div className="text-sm text-text-secondary truncate">{item.master.city}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {item.images && item.images.length > 0 ? (
                              <PostImageSlider images={item.images} alt={item.title} className="w-full" />
                            ) : item.videos && item.videos.length > 0 ? (
                              <div className="w-full">
                                <video src={item.videos[0]} controls className="w-full" />
                              </div>
                            ) : null}
                            <div className="px-4 sm:px-5 pt-3 pb-2">
                              <div className="flex items-center gap-4 mb-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); data.handleLike(item.id) }}
                                  className={item.liked ? 'text-brand-accent' : 'text-graphite-secondary'}
                                >
                                  <FiHeart size={24} className={item.liked ? 'fill-current' : ''} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const nextOpen = !item.showComments
                                    data.setCommentsOpen(item.id, nextOpen)
                                    if (nextOpen) data.fetchAllComments(item.id)
                                  }}
                                  className="text-graphite-secondary transition-colors"
                                >
                                  <FiMessageCircle size={24} />
                                </button>
                              </div>
                              {item.likes_count > 0 && (
                                <div className="text-sm font-semibold text-graphite-secondary mb-2">
                                  {item.likes_count} {item.likes_count === 1 ? 'лайк' : item.likes_count < 5 ? 'лайка' : 'лайков'}
                                </div>
                              )}
                            </div>
                            <div className="px-4 sm:px-5 pb-3">
                              {item.title && (
                                <div className="font-semibold text-base sm:text-lg text-graphite-secondary tracking-tight mb-1.5">{item.title}</div>
                              )}
                              {item.description && (
                                <p className="text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-wrap mb-2">{item.description}</p>
                              )}
                              {item.comments && item.comments.length > 0 && (
                                <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                                  {!item.showComments && item.comments_count > item.comments.length && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        data.setCommentsOpen(item.id, true)
                                        data.fetchAllComments(item.id)
                                      }}
                                      className="text-sm text-text-secondary hover:text-text-primary mb-2"
                                    >
                                      Показать все комментарии ({item.comments_count})
                                    </button>
                                  )}
                                  {item.showComments ? (
                                    <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                                      {item.comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-2">
                                          <div className="flex-1">
                                            <span className="font-semibold text-sm text-graphite-secondary mr-2">{comment.user?.full_name || 'Пользователь'}</span>
                                            <span className="text-sm text-text-secondary">{comment.content}</span>
                                            <div className="text-xs text-text-muted mt-0.5">{format(new Date(comment.created_at), 'd MMMM', { locale: ru })}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="space-y-2 mb-2">
                                      {item.comments.slice(-2).map((comment) => (
                                        <div key={comment.id} className="flex gap-2">
                                          <div className="flex-1">
                                            <span className="font-semibold text-sm text-graphite-secondary mr-2">{comment.user?.full_name || 'Пользователь'}</span>
                                            <span className="text-sm text-text-secondary">{comment.content}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              {data.user && (
                                <form
                                  onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); data.handleSubmitComment(item.id) }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-2 pt-2 border-t border-border-light/40"
                                >
                                  <input
                                    type="text"
                                    value={data.commentTexts[item.id] || ''}
                                    onChange={(e) => data.setCommentTexts({ ...data.commentTexts, [item.id]: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Добавить комментарий..."
                                    className="flex-1 text-sm bg-transparent border-none outline-none text-text-secondary placeholder-text-muted"
                                  />
                                  <button
                                    type="submit"
                                    disabled={!data.commentTexts[item.id]?.trim() || data.submittingComments[item.id]}
                                    onClick={(e) => e.stopPropagation()}
                                    className={data.commentTexts[item.id]?.trim() && !data.submittingComments[item.id] ? 'text-brand-accent' : 'text-text-muted'}
                                  >
                                    <FiSend size={18} />
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }}
                  </List>
                </div>
                {loadingMore && <div className="text-center text-sm text-text-secondary py-2">Загрузка…</div>}
                {hasMore && !loadingMore && (
                  <div className="mt-4 text-center">
                    <button type="button" onClick={loadMore} className="btn btn-secondary">
                      Загрузить ещё
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

