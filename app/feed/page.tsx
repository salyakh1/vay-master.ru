'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase, PortfolioItem, PortfolioComment, Product } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import CompactPageBanner from '@/components/CompactPageBanner'
import Link from 'next/link'
import { FiArrowLeft } from 'react-icons/fi'
import StoriesCircle from '@/components/StoriesCircle'
import { Story } from '@/lib/supabase'
import InstagramGrid, { type InstagramGridItem } from '@/components/feed/InstagramGrid'
import FeedPostCard from '@/components/feed/FeedPostCard'

interface ItemWithInteractions extends PortfolioItem {
  liked?: boolean
  comments?: PortfolioComment[]
  showComments?: boolean
}

type UnifiedFeedItem = {
  key: string
  type: 'portfolio' | 'product'
  created_at: string
  portfolio?: ItemWithInteractions
  product?: Product & {
    seller?: {
      id: string
      full_name?: string | null
      avatar_url?: string | null
      role?: string
      city?: string | null
    } | null
  }
}

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<UnifiedFeedItem[]>([])
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
  /** В Рекомендациях: сетка или вертикальная лента после клика */
  const [exploreView, setExploreView] = useState<'grid' | 'feed'>('grid')
  const [viewerStartKey, setViewerStartKey] = useState<string | null>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const feedScrollRef = useRef<HTMLDivElement>(null)

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
    setExploreView('grid')
    setViewerStartKey(null)
  }, [feedMode, feedTab])

  useEffect(() => {
    if (exploreView !== 'feed' || !viewerStartKey) return
    const t = window.setTimeout(() => {
      document.querySelector(`[data-feed-key="${viewerStartKey}"]`)?.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      })
    }, 80)
    return () => window.clearTimeout(t)
  }, [exploreView, viewerStartKey, items.length])

  useEffect(() => {
    if (user) {
      fetchStories()
    }
  }, [user])

  // РћР±РЅРѕРІР»СЏРµРј РёСЃС‚РѕСЂРёРё РїСЂРё С„РѕРєСѓСЃРµ РЅР° СЃС‚СЂР°РЅРёС†Рµ (РєРѕРіРґР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РІРѕР·РІСЂР°С‰Р°РµС‚СЃСЏ)
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

      let portfolioQuery = supabase
        .from('portfolio_items')
        .select(
          `
          *,
          master:profiles(id, full_name, avatar_url, role, city)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      let productsQuery = supabase
        .from('products')
        .select(
          `
          *,
          seller:profiles(id, full_name, avatar_url, role, city)
        `,
          { count: 'exact' }
        )
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (feedMode === 'following') {
        portfolioQuery = portfolioQuery.in('master_id', followingIds)
        productsQuery = productsQuery.in('seller_id', followingIds)
      }

      const [portfolioRes, productsRes] = await Promise.all([portfolioQuery, productsQuery])
      if (portfolioRes.error) throw portfolioRes.error
      if (productsRes.error) throw productsRes.error

      const portfolioItems = (portfolioRes.data as PortfolioItem[]) || []
      const products = (productsRes.data as Product[]) || []

      let portfolioWithInteractions: ItemWithInteractions[] = portfolioItems.map((item) => ({
        ...item,
        liked: false,
        comments: [],
        showComments: false,
      }))

      if (portfolioItems.length > 0 && user) {
        const itemIds = portfolioItems.map((item) => item.id)
        const [{ data: likesData }, { data: commentsData }] = await Promise.all([
          supabase
            .from('portfolio_likes')
            .select('portfolio_item_id')
            .eq('user_id', user.id)
            .in('portfolio_item_id', itemIds),
          supabase
            .from('portfolio_comments')
            .select(
              `
            *,
            user:profiles(id, full_name, avatar_url, role)
          `
            )
            .in('portfolio_item_id', itemIds)
            .order('created_at', { ascending: true })
            .limit(60),
        ])

        const likedItemIds = new Set(likesData?.map((l) => l.portfolio_item_id) || [])
        const commentsByItem = new Map<string, PortfolioComment[]>()
        commentsData?.forEach((comment: any) => {
          const itemId = comment.portfolio_item_id
          if (!commentsByItem.has(itemId)) commentsByItem.set(itemId, [])
          commentsByItem.get(itemId)!.push(comment as PortfolioComment)
        })

        portfolioWithInteractions = portfolioItems.map((item) => ({
          ...item,
          liked: likedItemIds.has(item.id),
          comments: commentsByItem.get(item.id)?.slice(0, 3) || [],
          showComments: false,
        }))
      }

      const unified: UnifiedFeedItem[] = [
        ...portfolioWithInteractions.map((item) => ({
          key: `portfolio-${item.id}`,
          type: 'portfolio' as const,
          created_at: item.created_at,
          portfolio: item,
        })),
        ...products.map((product) => ({
          key: `product-${product.id}`,
          type: 'product' as const,
          created_at: product.created_at,
          product: product as UnifiedFeedItem['product'],
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      if (reset) {
        setItems(unified)
      } else {
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.key))
          return [...prev, ...unified.filter((i) => !seen.has(i.key))]
        })
      }

      const portfolioHasMore =
        portfolioItems.length === ITEMS_PER_PAGE && (portfolioRes.count || 0) > pageNum * ITEMS_PER_PAGE
      const productsHasMore =
        products.length === ITEMS_PER_PAGE && (productsRes.count || 0) > pageNum * ITEMS_PER_PAGE
      setHasMore(portfolioHasMore || productsHasMore)
    } catch (error) {
      console.error('Error fetching feed items:', error)
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

  const updatePortfolio = (
    itemId: string,
    patch: (p: ItemWithInteractions) => ItemWithInteractions
  ) => {
    setItems((prev) =>
      prev.map((i) =>
        i.type === 'portfolio' && i.portfolio?.id === itemId && i.portfolio
          ? { ...i, portfolio: patch(i.portfolio) }
          : i
      )
    )
  }

  const handleLike = async (itemId: string) => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    const wrap = items.find((i) => i.type === 'portfolio' && i.portfolio?.id === itemId)
    const item = wrap?.portfolio
    if (!item) return

    try {
      if (item.liked) {
        const { error } = await supabase
          .from('portfolio_likes')
          .delete()
          .eq('portfolio_item_id', itemId)
          .eq('user_id', user.id)

        if (error) throw error
        updatePortfolio(itemId, (p) => ({
          ...p,
          liked: false,
          likes_count: Math.max(0, (p.likes_count || 0) - 1),
        }))
      } else {
        const { error } = await supabase.from('portfolio_likes').insert({
          portfolio_item_id: itemId,
          user_id: user.id,
        })

        if (error) throw error
        updatePortfolio(itemId, (p) => ({
          ...p,
          liked: true,
          likes_count: (p.likes_count || 0) + 1,
        }))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const setCommentsOpen = (itemId: string, open: boolean) => {
    updatePortfolio(itemId, (p) => ({ ...p, showComments: open }))
  }

  const fetchAllComments = async (itemId: string) => {
    try {
      const { data, error } = await supabase
        .from('portfolio_comments')
        .select(
          `
          *,
          user:profiles(id, full_name, avatar_url, role)
        `
        )
        .eq('portfolio_item_id', itemId)
        .order('created_at', { ascending: true })

      if (error) throw error

      updatePortfolio(itemId, (p) => ({
        ...p,
        comments: (data as PortfolioComment[]) || [],
      }))
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
      const { error } = await supabase.from('portfolio_comments').insert({
        portfolio_item_id: itemId,
        user_id: user.id,
        content: commentText,
      })

      if (error) throw error

      setCommentTexts({ ...commentTexts, [itemId]: '' })
      await fetchAllComments(itemId)

      updatePortfolio(itemId, (p) => ({
        ...p,
        comments_count: (p.comments_count || 0) + 1,
        showComments: true,
      }))
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmittingComments({ ...submittingComments, [itemId]: false })
    }
  }

  if (authLoading || !initialFeedModeResolved || loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] max-w-lg mx-auto">
        <div className="h-11 bg-white border-b border-[#dbdbdb] animate-pulse" />
        <div className="grid grid-cols-3 gap-[1px] bg-[#dbdbdb] mt-0">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-[#efefef] animate-pulse" />
          ))}
        </div>
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
    if (feedTab === 'masters') return item.type === 'portfolio'
    if (feedTab === 'sellers') return item.type === 'product'
    return true
  })

  const gridItems: InstagramGridItem[] = filteredItems.map((item) => {
    if (item.type === 'product' && item.product) {
      return {
        key: item.key,
        kind: 'product' as const,
        imageUrl: item.product.images?.[0] || null,
        title: item.product.name,
        price: item.product.price,
      }
    }
    const p = item.portfolio!
    return {
      key: item.key,
      kind: 'portfolio' as const,
      imageUrl: p.images?.[0] || null,
      videoUrl: p.videos?.[0] || null,
      title: p.title,
      likesCount: p.likes_count ?? 0,
    }
  })

  const showGrid = feedMode === 'explore' && exploreView === 'grid'
  const showFeedList = feedMode === 'following' || (feedMode === 'explore' && exploreView === 'feed')

  const openFeedFromGrid = (gridItem: InstagramGridItem) => {
    setViewerStartKey(gridItem.key)
    setExploreView('feed')
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-feed-key="${gridItem.key}"]`)
      el?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })
  }

  const backToGrid = () => {
    setExploreView('grid')
    setViewerStartKey(null)
  }

  const renderFeedList = () => (
    <div ref={feedScrollRef} className="bg-[#fafafa]">
      {filteredItems.map((feedItem) => {
        if (feedItem.type === 'product' && feedItem.product) {
          return (
            <FeedPostCard
              key={feedItem.key}
              type="product"
              item={feedItem.product}
              createdAt={feedItem.created_at}
            />
          )
        }
        const item = feedItem.portfolio
        if (!item) return null
        return (
          <FeedPostCard
            key={feedItem.key}
            type="portfolio"
            item={item}
            commentText={commentTexts[item.id] || ''}
            submittingComment={!!submittingComments[item.id]}
            onCommentChange={(text) => setCommentTexts((prev) => ({ ...prev, [item.id]: text }))}
            onLike={() => handleLike(item.id)}
            onToggleComments={() => {
              const nextOpen = !item.showComments
              setCommentsOpen(item.id, nextOpen)
              if (nextOpen) void fetchAllComments(item.id)
            }}
            onSubmitComment={() => void handleSubmitComment(item.id)}
          />
        )
      })}
      <div ref={loadMoreSentinelRef} className="h-8 w-full" aria-hidden />
      {loadingMore && <p className="text-center text-xs text-[#8e8e8e] py-3">Загрузка…</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fafafa] max-w-lg mx-auto w-full pb-24">
      {feedMode === 'explore' && exploreView === 'feed' ? (
        <Navbar bottomOnly />
      ) : (
        <Navbar />
      )}

      {/* Шапка: режимы */}
      {!(feedMode === 'explore' && exploreView === 'feed') && (
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#dbdbdb]">
          <div className="flex">
            <button
              type="button"
              onClick={() => setFeedMode('following')}
              className={`flex-1 text-center py-3 text-[13px] font-semibold ${
                feedMode === 'following'
                  ? 'text-[#262626] border-b-[1.5px] border-[#262626]'
                  : 'text-[#8e8e8e]'
              }`}
            >
              Подписки
            </button>
            <button
              type="button"
              onClick={() => {
                setFeedMode('explore')
                setExploreView('grid')
              }}
              className={`flex-1 text-center py-3 text-[13px] font-semibold ${
                feedMode === 'explore'
                  ? 'text-[#262626] border-b-[1.5px] border-[#262626]'
                  : 'text-[#8e8e8e]'
              }`}
            >
              Рекомендации
            </button>
          </div>
        </div>
      )}

      {/* Шапка ленты из сетки */}
      {feedMode === 'explore' && exploreView === 'feed' && (
        <div className="sticky top-0 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md border-b border-[#dbdbdb] px-2 py-2.5">
          <button
            type="button"
            onClick={backToGrid}
            className="w-9 h-9 flex items-center justify-center text-[#262626]"
            aria-label="Назад к сетке"
          >
            <FiArrowLeft size={22} />
          </button>
          <p className="text-[14px] font-semibold text-[#262626]">Рекомендации</p>
        </div>
      )}

      {showGrid &&
        (stories.length > 0 ||
          (!!user && (user.role === 'master' || user.role === 'seller'))) && (
        <div className="bg-white border-b border-[#efefef] px-3 py-2.5 overflow-x-auto">
          <StoriesCircle
            stories={stories}
            currentUser={user}
            showCreateButton
            onStoryCreated={fetchStories}
          />
        </div>
      )}

      {feedMode === 'following' &&
        (stories.length > 0 ||
          (!!user && (user.role === 'master' || user.role === 'seller'))) && (
        <div className="bg-white border-b border-[#efefef] px-3 py-2.5 overflow-x-auto">
          <StoriesCircle
            stories={stories}
            currentUser={user}
            showCreateButton
            onStoryCreated={fetchStories}
          />
        </div>
      )}

      {!(feedMode === 'explore' && exploreView === 'feed') && (
        <div className="flex gap-0 bg-white border-b border-[#efefef]">
          {FEED_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFeedTab(tab.key)}
              className={`flex-1 text-center py-2.5 text-[12px] font-semibold ${
                feedTab === tab.key ? 'text-[#262626]' : 'text-[#8e8e8e]'
              }`}
            >
              {tab.label}
              {feedTab === tab.key && (
                <span className="block mx-auto mt-1.5 h-[1.5px] w-10 bg-[#262626] rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

      {showGrid && (
        <div className="px-0 pt-0">
          <CompactPageBanner page="feed" />
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="text-[15px] font-semibold text-[#262626] mb-1">
            {feedMode === 'following' ? 'В подписках пока пусто' : 'Пока нет публикаций'}
          </p>
          <p className="text-[13px] text-[#8e8e8e] mb-4">
            {feedMode === 'following'
              ? 'Подпишитесь на мастеров и продавцов — их посты появятся здесь'
              : 'Работы мастеров и товары продавцов появятся в сетке'}
          </p>
          {feedMode === 'following' && (
            <div className="flex flex-col gap-2 max-w-[220px] mx-auto">
              <Link href="/search" className="bg-[#e63946] text-white text-[13px] font-semibold py-2 rounded-lg">
                Найти мастеров
              </Link>
              <button
                type="button"
                onClick={() => setFeedMode('explore')}
                className="text-[13px] font-semibold text-[#0095f6]"
              >
                Смотреть рекомендации
              </button>
            </div>
          )}
        </div>
      ) : showGrid ? (
        <>
          <InstagramGrid items={gridItems} onItemClick={(item) => openFeedFromGrid(item)} />
          <div ref={loadMoreSentinelRef} className="h-8 w-full" aria-hidden />
          {loadingMore && <p className="text-center text-xs text-[#8e8e8e] py-3">Загрузка…</p>}
        </>
      ) : showFeedList ? (
        renderFeedList()
      ) : null}
    </div>
  )
}
