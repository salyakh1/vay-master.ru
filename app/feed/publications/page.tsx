'use client'

import { useEffect, useState, useMemo, useRef, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { VariableSizeList as List, FixedSizeGrid as Grid } from 'react-window'
import { useAuth } from '../../providers'
import { supabase, PortfolioItem, Product, PortfolioComment } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import PostImageSlider from '@/components/PostImageSlider'
import ProductCard from '@/components/ProductCard'
import { FiHeart, FiMessageCircle, FiSend, FiFilter, FiX } from 'react-icons/fi'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import AuthRequiredModal from '@/components/AuthRequiredModal'
import { getProductCategoriesForSpecializations } from '@/lib/specialization-product-mapping'

const RecommendationsCarousel = dynamic(() => import('@/components/RecommendationsCarousel'), {
  ssr: false,
  loading: () => <div className="h-[200px] bg-bg-secondary rounded-xl animate-pulse" aria-hidden />,
})

interface ItemWithInteractions extends PortfolioItem {
  liked?: boolean
  comments?: PortfolioComment[]
  showComments?: boolean
}

type ContentType = 'all' | 'portfolio' | 'products'
type ViewMode = 'grid' | 'list'

interface UnifiedItem {
  id: string
  type: 'portfolio' | 'product'
  created_at: string
  portfolioItem?: ItemWithInteractions
  product?: Product
  likes_count?: number
  comments_count?: number
}

export default function PublicationsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<UnifiedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [contentType, setContentType] = useState<ContentType>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({})
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  
  // Refs и размеры для виртуализации
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 })
  const [listDimensions, setListDimensions] = useState({ width: 0, height: 0 })
  
  const GRID_COLUMN_COUNT = 3
  const GRID_GAP = 8
  const LIST_ITEM_HEIGHT_PORTFOLIO = 580
  const LIST_ITEM_HEIGHT_PRODUCT = 340
  const LIST_ROW_GAP = 28
  const getItemSize = useCallback(
    (index: number) =>
      (items[index]?.type === 'portfolio' ? LIST_ITEM_HEIGHT_PORTFOLIO : LIST_ITEM_HEIGHT_PRODUCT) + LIST_ROW_GAP,
    [items]
  )

  const ITEMS_PER_PAGE = 12
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

  // Загружаем специализации мастера и получаем категории товаров
  const [masterSpecializations, setMasterSpecializations] = useState<Array<{ id: string; slug: string }>>([])
  const [loadingSpecializations, setLoadingSpecializations] = useState(false)
  
  useEffect(() => {
    const loadMasterCategories = async () => {
      if (user?.role === 'master' && user.id) {
        setLoadingSpecializations(true)
        try {
          const { data, error } = await supabase
            .from('profile_subcategories')
            .select('subcategory:subcategories(id, slug, category:categories(id, slug))')
            .eq('profile_id', user.id)
          if (!error && data) {
            const slugs = (data as any[])
              .map((item) => item.subcategory?.category?.slug)
              .filter(Boolean) as string[]
            setMasterSpecializations(Array.from(new Set(slugs)).map((slug) => ({ id: slug, slug })))
          } else {
            setMasterSpecializations([])
          }
        } catch (error) {
          console.error('Error loading master categories:', error)
          setMasterSpecializations([])
        } finally {
          setLoadingSpecializations(false)
        }
      } else {
        setMasterSpecializations([])
        setLoadingSpecializations(false)
      }
    }
    loadMasterCategories()
  }, [user])

  const masterProductCategories = useMemo(() => {
    if (user?.role !== 'master' || masterSpecializations.length === 0) {
      return { categorySlugs: undefined, subcategorySlugs: undefined }
    }
    const categorySlugs = masterSpecializations.map((s) => s.slug)
    return getProductCategoriesForSpecializations(categorySlugs)
  }, [user, masterSpecializations])

  const isMasterWithCategories = user?.role === 'master' &&
    !loadingSpecializations &&
    masterProductCategories.categorySlugs &&
    masterProductCategories.categorySlugs.length > 0

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      setPage(1)
      setItems([])
      setHasMore(true)
      fetchAllContent(1, true)
    }
  }, [user, contentType, cityFilter])

  const listHeight = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.75, 900) : 600
  const gridHeight = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.75, 800) : 600

  useEffect(() => {
    const updateDimensions = () => {
      if (gridContainerRef.current && viewMode === 'grid') {
        setGridDimensions({
          width: gridContainerRef.current.offsetWidth,
          height: gridHeight
        })
      }
      if (listContainerRef.current && viewMode === 'list') {
        setListDimensions({
          width: listContainerRef.current.offsetWidth,
          height: listHeight
        })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [viewMode, items.length, gridHeight, listHeight])

  const listRef = useRef<List>(null)
  // Клик по плитке в сетке => переключаемся в ленту и скроллим к выбранному элементу (виртуализация)
  useEffect(() => {
    if (viewMode !== 'list' || !activeItemId || items.length === 0) return
    const idx = items.findIndex((i) => i.id === activeItemId)
    if (idx >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToItem(idx, 'start')
      })
    }
  }, [viewMode, activeItemId, items.length])

  const fetchAllContent = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const from = (pageNum - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      
      // Загружаем работы мастеров (portfolio_items)
      let portfolioResult: any = { data: [], error: null }
      if (contentType === 'all' || contentType === 'portfolio') {
        portfolioResult = await supabase
          .from('portfolio_items')
          .select(`
            *,
            master:profiles(id, full_name, avatar_url, role, city)
          `)
          .order('created_at', { ascending: false })
          .range(from, to)
      }
      
      // Загружаем товары (products)
      let productsResult: any = { data: [], error: null }
      if (contentType === 'all' || contentType === 'products') {
        productsResult = await supabase
          .from('products')
          .select(`
            *,
            seller:profiles(id, full_name, avatar_url, city, phone),
            category_ref:product_categories(id, name, section, slug)
          `)
          .eq('in_stock', true)
          .order('created_at', { ascending: false })
          .range(from, to)
      }
      
      if (portfolioResult.error) throw portfolioResult.error
      if (productsResult.error) throw productsResult.error
      
      const portfolioItems = (portfolioResult.data as PortfolioItem[]) || []
      const products = (productsResult.data as Product[]) || []
      
      // Фильтруем по городу на клиенте
      let filteredPortfolio = portfolioItems
      let filteredProducts = products
      
      if (cityFilter && cityFilter.trim()) {
        filteredPortfolio = portfolioItems.filter((item: any) => {
          const master = item.master
          return master?.city && master.city.toLowerCase().includes(cityFilter.toLowerCase())
        })
        
        filteredProducts = products.filter((product: any) => {
          const seller = product.seller
          return seller?.city && seller.city.toLowerCase().includes(cityFilter.toLowerCase())
        })
      }
      
      // Получаем данные о лайках и комментариях для работ
      let portfolioWithInteractions: ItemWithInteractions[] = []
      
      if (filteredPortfolio.length > 0 && user) {
        const itemIds = filteredPortfolio.map(item => item.id)
        
        // Получаем лайки текущего пользователя
        const { data: likesData } = await supabase
          .from('portfolio_likes')
          .select('portfolio_item_id')
          .eq('user_id', user.id)
          .in('portfolio_item_id', itemIds)
        
        const likedItemIds = new Set(likesData?.map(l => l.portfolio_item_id) || [])
        
        // Получаем комментарии для всех работ (первые 2 для каждой)
        const { data: commentsData } = await supabase
          .from('portfolio_comments')
          .select(`
            *,
            user:profiles(id, full_name, avatar_url, role)
          `)
          .in('portfolio_item_id', itemIds)
          .order('created_at', { ascending: true })
        
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
        portfolioWithInteractions = filteredPortfolio.map(item => ({
          ...item,
          liked: likedItemIds.has(item.id),
          comments: commentsByItem.get(item.id)?.slice(0, 2) || [],
          showComments: false,
        }))
      } else {
        portfolioWithInteractions = filteredPortfolio.map(item => ({
          ...item,
          liked: false,
          comments: [],
          showComments: false,
        }))
      }
      
      // Объединяем работы и товары в один массив
      const unifiedItems: UnifiedItem[] = [
        ...portfolioWithInteractions.map(item => ({
          id: item.id,
          type: 'portfolio' as const,
          created_at: item.created_at,
          portfolioItem: item,
          likes_count: item.likes_count || 0,
          comments_count: item.comments_count || 0,
        })),
        ...filteredProducts.map(product => ({
          id: product.id,
          type: 'product' as const,
          created_at: product.created_at,
          product: product,
        })),
      ]
      
      // Сортируем по дате создания (новые сверху)
      unifiedItems.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      if (reset) {
        setItems(unifiedItems)
      } else {
        setItems(prev => [...prev, ...unifiedItems])
      }
      
      // Проверяем, есть ли ещё данные
      const hasMorePortfolio = contentType !== 'products' && portfolioResult.data?.length === ITEMS_PER_PAGE
      const hasMoreProducts = contentType !== 'portfolio' && productsResult.data?.length === ITEMS_PER_PAGE
      setHasMore(hasMorePortfolio || hasMoreProducts)
    } catch (error) {
      console.error('Error fetching all content:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchAllContent(nextPage, false)
    }
  }

  useEffect(() => {
    const el = loadMoreSentinelRef.current
    if (!el || !hasMore || loadingMore) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore() },
      { rootMargin: '300px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, page, items.length])

  const handleLike = async (itemId: string) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    try {
      const item = items.find(i => i.type === 'portfolio' && i.id === itemId)
      if (!item || item.type !== 'portfolio') return

      const portfolioItem = item.portfolioItem
      if (!portfolioItem) return

      if (portfolioItem.liked) {
        const { error } = await supabase
          .from('portfolio_likes')
          .delete()
          .eq('portfolio_item_id', itemId)
          .eq('user_id', user.id)

        if (error) throw error
        setItems(prev => prev.map(i =>
          i.id === itemId && i.type === 'portfolio'
            ? {
                ...i,
                portfolioItem: {
                  ...i.portfolioItem!,
                  liked: false,
                  likes_count: Math.max(0, (i.portfolioItem!.likes_count || 0) - 1),
                },
              }
            : i
        ))
      } else {
        const { error } = await supabase
          .from('portfolio_likes')
          .insert({
            portfolio_item_id: itemId,
            user_id: user.id,
          })

        if (error) throw error
        setItems(prev => prev.map(i =>
          i.id === itemId && i.type === 'portfolio'
            ? {
                ...i,
                portfolioItem: {
                  ...i.portfolioItem!,
                  liked: true,
                  likes_count: (i.portfolioItem!.likes_count || 0) + 1,
                },
              }
            : i
        ))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const setCommentsOpen = (itemId: string, open: boolean) => {
    setItems(prev => prev.map(i =>
      i.id === itemId && i.type === 'portfolio'
        ? {
            ...i,
            portfolioItem: {
              ...i.portfolioItem!,
              showComments: open,
            },
          }
        : i
    ))
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

      setItems(prev =>
        prev.map(i =>
          i.id === itemId && i.type === 'portfolio'
            ? {
                ...i,
                portfolioItem: {
                  ...i.portfolioItem!,
                  comments: (data as PortfolioComment[]) || [],
                },
              }
            : i
        )
      )
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleSubmitComment = async (itemId: string) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    const commentText = commentTexts[itemId]?.trim()
    if (!commentText) return

    setSubmittingComments(prev => ({ ...prev, [itemId]: true }))
    try {
      const { error } = await supabase
        .from('portfolio_comments')
        .insert({
          portfolio_item_id: itemId,
          user_id: user.id,
          content: commentText,
        })

      if (error) throw error

      setCommentTexts(prev => ({ ...prev, [itemId]: '' }))
      await fetchAllComments(itemId)

      // Обновляем счетчик комментариев
      setItems(prev => prev.map(i =>
        i.id === itemId && i.type === 'portfolio'
          ? {
              ...i,
              portfolioItem: {
                ...i.portfolioItem!,
                comments_count: (i.portfolioItem!.comments_count || 0) + 1,
              },
            }
          : i
      ))
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmittingComments(prev => ({ ...prev, [itemId]: false }))
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
      <div className="container mx-auto px-4 py-6">
        <div className={`${viewMode === 'grid' ? 'max-w-full' : 'max-w-2xl'} mx-auto`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-graphite-secondary tracking-tight">
              Все публикации
            </h1>
            <div className="flex items-center gap-3">
              {viewMode === 'list' && (
                <button
                  onClick={() => {
                    setViewMode('grid')
                    setActiveItemId(null)
                  }}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Сетка
                </button>
              )}
              <Link
                href="/feed"
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Моя лента
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-border-light/40 rounded-lg hover:bg-bg-secondary transition-colors"
              >
                <FiFilter size={18} />
                <span className="text-sm">Фильтры</span>
              </button>
              {cityFilter && (
                <button
                  onClick={() => setCityFilter('')}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-brand-accent/10 text-brand-accent rounded-lg hover:bg-brand-accent/20 transition-colors"
                >
                  <span>Город: {cityFilter}</span>
                  <FiX size={14} />
                </button>
              )}
            </div>

            {showFilters && (
              <div className="bg-bg-card rounded-lg border border-border-light/40 p-4 mb-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-graphite-secondary mb-2">
                    Тип контента
                  </label>
                  <div className="flex gap-2">
                    {(['all', 'portfolio', 'products'] as ContentType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setContentType(type)
                          setShowFilters(false)
                        }}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                          contentType === type
                            ? 'bg-brand-accent text-white'
                            : 'bg-bg-secondary text-text-secondary hover:bg-bg-secondary/80'
                        }`}
                      >
                        {type === 'all' ? 'Все' : type === 'portfolio' ? 'Работы' : 'Товары'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-graphite-secondary mb-2">
                    Город
                  </label>
                  <input
                    type="text"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    placeholder="Введите город"
                    className="input w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="card text-center text-text-secondary py-12">
              <p className="text-lg font-medium text-graphite-secondary">
                Загрузка...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="card text-center text-text-secondary py-12">
              <p className="text-lg font-medium text-graphite-secondary">
                Публикации не найдены
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View - виртуализированная сетка 3 колонки */
            <div
              ref={gridContainerRef}
              style={{ height: gridDimensions.height || gridHeight, minHeight: 300 }}
              className="w-full"
            >
              {gridDimensions.width > 0 && (
                <Grid
                  width={gridDimensions.width}
                  height={gridDimensions.height || gridHeight}
                  columnCount={GRID_COLUMN_COUNT}
                  rowCount={Math.ceil(items.length / GRID_COLUMN_COUNT) || 1}
                  columnWidth={Math.floor((gridDimensions.width - GRID_GAP * (GRID_COLUMN_COUNT - 1)) / GRID_COLUMN_COUNT)}
                  rowHeight={Math.floor((gridDimensions.width - GRID_GAP * (GRID_COLUMN_COUNT - 1)) / GRID_COLUMN_COUNT) + GRID_GAP}
                  itemData={{ items, setActiveItemId, setViewMode }}
                  onScroll={({ scrollTop }) => {
                    const rowH = Math.floor((gridDimensions.width - GRID_GAP * (GRID_COLUMN_COUNT - 1)) / GRID_COLUMN_COUNT) + GRID_GAP
                    const totalH = Math.ceil(items.length / GRID_COLUMN_COUNT) * rowH
                    if (totalH > 0 && scrollTop + (gridDimensions.height || gridHeight) >= totalH - 200 && hasMore && !loadingMore) {
                      loadMore()
                    }
                  }}
                >
                  {({ columnIndex, rowIndex, style, data }) => {
                    const index = rowIndex * GRID_COLUMN_COUNT + columnIndex
                    const item = data.items[index]
                    if (!item) return <div style={style} />
                    const thumbnail =
                      item.type === 'portfolio' && item.portfolioItem?.images?.[0]
                        ? item.portfolioItem.images[0]
                        : item.type === 'product' && item.product?.images?.[0]
                        ? item.product.images[0]
                        : null
                    return (
                      <div style={{ ...style, padding: GRID_GAP / 2, boxSizing: 'border-box' }}>
                        <button
                          type="button"
                          onClick={() => {
                            data.setActiveItemId(item.id)
                            data.setViewMode('list')
                          }}
                          className="relative w-full h-full min-h-[80px] overflow-hidden rounded-lg bg-bg-secondary group cursor-pointer block"
                        >
                          {thumbnail ? (
                            <div className="relative w-full h-full">
                              <Image
                                src={thumbnail}
                                alt={item.type === 'portfolio' ? item.portfolioItem?.title || 'Работа' : item.product?.name || 'Товар'}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                                sizes="(max-width: 768px) 33vw, 300px"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-text-muted">
                              {item.type === 'portfolio' ? '📷' : '🛍️'}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs">
                              {item.type === 'portfolio' && item.portfolioItem?.likes_count ? (
                                <span className="flex items-center gap-1"><FiHeart size={12} className="fill-current" />{item.portfolioItem.likes_count}</span>
                              ) : item.type === 'product' && item.product?.price ? (
                                <span className="font-semibold">{item.product.price.toLocaleString('ru-RU')} ₽</span>
                              ) : null}
                            </div>
                          </div>
                          {item.type === 'portfolio' && item.portfolioItem?.images && item.portfolioItem.images.length > 1 && (
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded">
                              {item.portfolioItem.images.length}
                            </div>
                          )}
                        </button>
                      </div>
                    )
                  }}
                </Grid>
              )}
            </div>
          ) : (
            /* List View - виртуализированный вертикальный список */
            <>
              <div className="mb-7">
                <RecommendationsCarousel
                  title={
                    isMasterWithCategories
                      ? "Рекомендации под ваши услуги"
                      : "Товары от Pro‑продавцов"
                  }
                  categorySlugs={isMasterWithCategories ? masterProductCategories.categorySlugs : undefined}
                  subcategorySlugs={isMasterWithCategories ? masterProductCategories.subcategorySlugs : undefined}
                  role={user?.role || 'client'}
                  limit={12}
                />
              </div>
              <div
                ref={listContainerRef}
                style={{ height: listHeight, minHeight: 400 }}
                className="w-full"
              >
                {listDimensions.width > 0 && items.length > 0 && (
                  <List
                    ref={listRef}
                    width={listDimensions.width}
                    height={listHeight}
                    itemCount={items.length}
                    itemSize={getItemSize}
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
                      let total = 0
                      for (let i = 0; i < items.length; i++) total += getItemSize(i)
                      if (total > 0 && scrollOffset + listHeight >= total - 400 && hasMore && !loadingMore) {
                        loadMore()
                      }
                    }}
                  >
                    {({ index, style, data }) => {
                      const item = data.items[index]
                      if (!item) return <div style={style} />
                      if (item.type === 'portfolio' && item.portfolioItem) {
                        const portfolioItem = item.portfolioItem
                        const master = portfolioItem.master as any
                        return (
                          <div style={style} className="pb-7">
                            <div
                              id={`item-${item.id}`}
                              className="bg-bg-card rounded-lg border border-border-light/40 overflow-hidden"
                            >
                              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                                <div className="flex items-center gap-3">
                                  <Link href={`/profile/${master?.id}`} className="relative w-10 h-10 sm:w-12 sm:h-12 bg-graphite-primary text-white flex items-center justify-center text-sm font-semibold rounded-full flex-shrink-0 overflow-hidden">
                                    {master?.avatar_url ? (
                                      <Image src={master.avatar_url} alt={master.full_name} fill className="object-cover rounded-full" sizes="(max-width: 640px) 40px, 48px" loading="lazy" />
                                    ) : (
                                      master?.full_name?.[0]?.toUpperCase() || 'M'
                                    )}
                                  </Link>
                                  <div className="flex-1 min-w-0">
                                    <Link href={`/profile/${master?.id}`} className="font-semibold text-base text-graphite-secondary truncate hover:text-brand-accent transition-colors">
                                      {master?.full_name || 'Мастер'}
                                    </Link>
                                    {master?.city && <div className="text-sm text-text-secondary truncate">{master.city}</div>}
                                  </div>
                                </div>
                              </div>
                              {portfolioItem.images && portfolioItem.images.length > 0 ? (
                                <PostImageSlider images={portfolioItem.images} alt={portfolioItem.title} className="w-full" />
                              ) : portfolioItem.videos && portfolioItem.videos.length > 0 ? (
                                <div className="w-full"><video src={portfolioItem.videos[0]} controls className="w-full" /></div>
                              ) : null}
                              <div className="px-4 sm:px-5 pt-3 pb-2">
                                <div className="flex items-center gap-4 mb-2">
                                  <button onClick={(e) => { e.stopPropagation(); data.handleLike(item.id) }} className={portfolioItem.liked ? 'text-brand-accent' : 'text-graphite-secondary'}>
                                    <FiHeart size={24} className={portfolioItem.liked ? 'fill-current' : ''} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); const nextOpen = !portfolioItem.showComments; data.setCommentsOpen(item.id, nextOpen); if (nextOpen) data.fetchAllComments(item.id) }} className="text-graphite-secondary">
                                    <FiMessageCircle size={24} />
                                  </button>
                                </div>
                                {portfolioItem.likes_count > 0 && (
                                  <div className="text-sm font-semibold text-graphite-secondary mb-2">
                                    {portfolioItem.likes_count} {portfolioItem.likes_count === 1 ? 'лайк' : portfolioItem.likes_count < 5 ? 'лайка' : 'лайков'}
                                  </div>
                                )}
                              </div>
                              <div className="px-4 sm:px-5 pb-3">
                                {portfolioItem.title && <div className="font-semibold text-base sm:text-lg text-graphite-secondary tracking-tight mb-1.5">{portfolioItem.title}</div>}
                                {portfolioItem.description && <p className="text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-wrap mb-2">{portfolioItem.description}</p>}
                                {portfolioItem.comments && portfolioItem.comments.length > 0 && (
                                  <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                                    {!portfolioItem.showComments && portfolioItem.comments_count && portfolioItem.comments_count > portfolioItem.comments.length && (
                                      <button onClick={(e) => { e.stopPropagation(); data.setCommentsOpen(item.id, true); data.fetchAllComments(item.id) }} className="text-sm text-text-secondary hover:text-text-primary mb-2">
                                        Показать все комментарии ({portfolioItem.comments_count})
                                      </button>
                                    )}
                                    {portfolioItem.showComments ? (
                                      <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                                        {portfolioItem.comments.map((comment: PortfolioComment) => (
                                          <div key={comment.id} className="flex gap-2">
                                            <div className="flex-1">
                                              <span className="font-semibold text-sm text-graphite-secondary mr-2">{(comment as any).user?.full_name || 'Пользователь'}</span>
                                              <span className="text-sm text-text-secondary">{comment.content}</span>
                                              <div className="text-xs text-text-muted mt-0.5">{format(new Date(comment.created_at), 'd MMMM', { locale: ru })}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="space-y-2 mb-2">
                                        {portfolioItem.comments.slice(-2).map((comment: PortfolioComment) => (
                                          <div key={comment.id} className="flex gap-2">
                                            <div className="flex-1">
                                              <span className="font-semibold text-sm text-graphite-secondary mr-2">{(comment as any).user?.full_name || 'Пользователь'}</span>
                                              <span className="text-sm text-text-secondary">{comment.content}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {data.user && (
                                  <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); data.handleSubmitComment(item.id) }} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 pt-2 border-t border-border-light/40">
                                    <input
                                      type="text"
                                      value={data.commentTexts[item.id] || ''}
                                      onChange={(e) => data.setCommentTexts({ ...data.commentTexts, [item.id]: e.target.value })}
                                      placeholder="Добавить комментарий..."
                                      className="flex-1 text-sm bg-transparent border-none outline-none text-text-secondary placeholder-text-muted"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <button type="submit" disabled={!data.commentTexts[item.id]?.trim() || data.submittingComments[item.id]} className={data.commentTexts[item.id]?.trim() && !data.submittingComments[item.id] ? 'text-brand-accent' : 'text-text-muted'} onClick={(e) => e.stopPropagation()}>
                                      <FiSend size={18} />
                                    </button>
                                  </form>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      }
                      if (item.type === 'product' && item.product) {
                        return (
                          <div style={style} className="pb-7">
                            <div id={`item-${item.id}`}>
                              <ProductCard product={item.product} currentUser={data.user} />
                            </div>
                          </div>
                        )
                      }
                      return <div style={style} />
                    }}
                  </List>
                )}
              </div>
              {loadingMore && (
                <div className="py-4 text-center text-sm text-text-secondary">Загрузка...</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        type="master"
      />
    </div>
  )
}
