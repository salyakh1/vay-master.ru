'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '../providers'
import { supabase, PortfolioItem, PortfolioComment } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import AdBannerSlider from '@/components/AdBannerSlider'
import Link from 'next/link'
import { FiHeart, FiMessageCircle } from 'react-icons/fi'
import StoriesCircle from '@/components/StoriesCircle'
import PostImageSlider from '@/components/PostImageSlider'
import { Story } from '@/lib/supabase'

const FEED_MEDIA_MAX_HEIGHT = 320

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
  const [feedTab, setFeedTab] = useState<'all' | 'masters' | 'sellers' | 'subs'>('all')
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

  const ITEMS_PER_PAGE = 9

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
      <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto">
        <div className="h-12 bg-white animate-pulse mb-2" />
        <div className="h-16 bg-white animate-pulse mb-2" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-48 bg-white mb-2 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!user) return null

  const FEED_TABS = [
    { key: 'all' as const, label: 'Все' },
    { key: 'masters' as const, label: 'Мастера' },
    { key: 'sellers' as const, label: 'Продавцы' },
    { key: 'subs' as const, label: 'Подписки' },
  ]

  const filteredItems = items.filter((item) => {
    const role = item.master?.role
    if (feedTab === 'masters') return role === 'master'
    if (feedTab === 'sellers') return role === 'seller'
    return true
  })

  return (
    <div className="min-h-screen bg-[#f2f2f7] max-w-lg mx-auto w-full pb-24">
      <Navbar />

      {stories.length > 0 && (
        <div className="bg-white border-b border-[#e5e5ea]/80 px-4 py-3 overflow-x-auto">
          <StoriesCircle stories={stories} currentUser={user} isOwnProfile={false} onStoryCreated={fetchStories} />
        </div>
      )}

      <div className="bg-white border-b border-[#e5e5ea]/80 flex">
        {FEED_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFeedTab(tab.key)}
            className={`flex-1 text-center py-2.5 text-[11px] font-medium border-b-[1.5px] -mb-px ${
              feedTab === tab.key ? 'text-[#c0392b] font-semibold border-[#c0392b]' : 'text-[#8e8e93] border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="w-full mb-2">
        <AdBannerSlider page="feed" />
      </div>

      <div className="pb-4">
        {filteredItems.length === 0 && !loading ? (
          <div className="bg-white text-center text-[#8e8e93] py-14 px-6">
            <p className="text-[15px] font-semibold text-[#1c1c1e] mb-2">Лента пуста</p>
            <p className="text-[12px] leading-relaxed">Подпишитесь на мастеров и продавцов — их работы появятся здесь</p>
          </div>
        ) : (
          <>
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white mb-2">
                <div className="flex items-center gap-2.5 px-4 pt-3 pb-0">
                  <Link href={`/profile/${item.master?.id}`} className="w-[38px] h-[38px] rounded-full bg-[#c0392b] text-white flex items-center justify-center text-xs font-semibold overflow-hidden flex-shrink-0 relative">
                    {item.master?.avatar_url ? (
                      <Image src={item.master.avatar_url} alt="" fill className="object-cover" sizes="38px" />
                    ) : (
                      item.master?.full_name?.[0]?.toUpperCase() || 'M'
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1c1c1e] truncate flex items-center gap-1">
                      {item.master?.full_name || 'Мастер'}
                    </div>
                    <div className="text-[10px] text-[#8e8e93] truncate">
                      {item.master?.role === 'seller' ? 'Продавец' : 'Мастер'}
                      {item.master?.city ? ` · ${item.master.city}` : ''}
                    </div>
                  </div>
                </div>
                {item.description && (
                  <p className="px-4 pt-2.5 text-[13px] text-[#3c3c43] leading-relaxed">{item.description}</p>
                )}
                {item.images && item.images.length > 0 ? (
                  <div className="mt-2.5 h-[180px] bg-[#f2f2f7] overflow-hidden">
                    <PostImageSlider images={item.images} alt={item.title} className="w-full h-full [&_img]:!h-[180px] [&_img]:!object-cover" />
                  </div>
                ) : item.videos && item.videos.length > 0 ? (
                  <div className="mt-2.5 h-[180px] bg-[#f2f2f7] overflow-hidden">
                    <video src={item.videos[0]} controls className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <div className="flex items-center px-3 py-2 border-t border-[#f2f2f7] gap-1">
                  <button
                    type="button"
                    onClick={() => handleLike(item.id)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium ${item.liked ? 'text-[#c0392b]' : 'text-[#6d6d72]'}`}
                  >
                    <FiHeart size={14} className={item.liked ? 'fill-current' : ''} />
                    {item.likes_count > 0 ? item.likes_count : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextOpen = !item.showComments
                      setCommentsOpen(item.id, nextOpen)
                      if (nextOpen) fetchAllComments(item.id)
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-[#6d6d72]"
                  >
                    <FiMessageCircle size={14} />
                    {(item.comments_count ?? 0) > 0 ? item.comments_count : ''}
                  </button>
                </div>
                {item.title && (
                  <p className="px-4 pb-2 text-[12px] font-semibold text-[#1c1c1e]">{item.title}</p>
                )}
              </div>
            ))}
            <div ref={loadMoreSentinelRef} className="h-2 w-full" aria-hidden />
            {loadingMore && <div className="text-center text-xs text-[#8e8e93] py-2">Загрузка…</div>}
          </>
        )}
      </div>
    </div>
  )
}

