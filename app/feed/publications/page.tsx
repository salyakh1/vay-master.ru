'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../providers'
import { supabase, PortfolioItem, Product, PortfolioComment } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import PostImageSlider from '@/components/PostImageSlider'
import ProductCard from '@/components/ProductCard'
import { FiHeart, FiMessageCircle, FiSend, FiFilter, FiX } from 'react-icons/fi'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import AuthRequiredModal from '@/components/AuthRequiredModal'

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
  const [contentType, setContentType] = useState<ContentType>('all')
  const [cityFilter, setCityFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({})
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchAllContent()
    }
  }, [user, contentType, cityFilter])

  // Клик по плитке в сетке => переключаемся в ленту и скроллим к выбранному элементу
  useEffect(() => {
    if (viewMode !== 'list' || !activeItemId) return
    requestAnimationFrame(() => {
      const el = document.getElementById(`item-${activeItemId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [viewMode, activeItemId, items.length])

  const fetchAllContent = async () => {
    try {
      setLoading(true)
      
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
          .limit(200)
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
          .limit(200)
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
      setItems(unifiedItems)
    } catch (error) {
      console.error('Error fetching all content:', error)
    } finally {
      setLoading(false)
    }
  }

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
            /* Grid View - 3x3 */
            <div className="grid grid-cols-3 gap-1 sm:gap-2 w-full">
              {items.map((item) => {
                const thumbnail =
                  item.type === 'portfolio' && item.portfolioItem?.images?.[0]
                    ? item.portfolioItem.images[0]
                    : item.type === 'product' && item.product?.images?.[0]
                    ? item.product.images[0]
                    : null

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveItemId(item.id)
                      setViewMode('list')
                    }}
                    className="relative aspect-square overflow-hidden rounded-lg bg-bg-secondary group cursor-pointer"
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={
                          item.type === 'portfolio'
                            ? item.portfolioItem?.title || 'Работа'
                            : item.product?.name || 'Товар'
                        }
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        {item.type === 'portfolio' ? '📷' : '🛍️'}
                      </div>
                    )}
                    {/* Overlay with info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs">
                        {item.type === 'portfolio' && item.portfolioItem?.likes_count ? (
                          <div className="flex items-center gap-1">
                            <FiHeart size={12} className="fill-current" />
                            <span>{item.portfolioItem.likes_count}</span>
                          </div>
                        ) : item.type === 'product' && item.product?.price ? (
                          <div className="font-semibold">
                            {item.product.price.toLocaleString('ru-RU')} ₽
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {/* Multiple images indicator */}
                    {item.type === 'portfolio' &&
                      item.portfolioItem?.images &&
                      item.portfolioItem.images.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded">
                          {item.portfolioItem.images.length}
                        </div>
                      )}
                  </button>
                )
              })}
            </div>
          ) : (
            /* List View - Vertical Feed */
            <div className="space-y-7">
              {items.map((item) => {
                if (item.type === 'portfolio' && item.portfolioItem) {
                  const portfolioItem = item.portfolioItem
                  const master = portfolioItem.master as any

                  return (
                    <div
                      key={item.id}
                      id={`item-${item.id}`}
                      className="bg-bg-card rounded-lg border border-border-light/40 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/profile/${master?.id}`}
                            className="w-10 h-10 sm:w-12 sm:h-12 bg-graphite-primary text-white flex items-center justify-center text-sm font-semibold rounded-full flex-shrink-0"
                          >
                            {master?.avatar_url ? (
                              <img
                                src={master.avatar_url}
                                alt={master.full_name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              master?.full_name?.[0]?.toUpperCase() || 'M'
                            )}
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/profile/${master?.id}`}
                              className="font-semibold text-base text-graphite-secondary truncate hover:text-brand-accent transition-colors"
                            >
                              {master?.full_name || 'Мастер'}
                            </Link>
                            {master?.city && (
                              <div className="text-sm text-text-secondary truncate">
                                {master.city}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Images/Video */}
                      {portfolioItem.images && portfolioItem.images.length > 0 ? (
                        <PostImageSlider
                          images={portfolioItem.images}
                          alt={portfolioItem.title}
                          className="w-full"
                        />
                      ) : portfolioItem.videos && portfolioItem.videos.length > 0 ? (
                        <div className="w-full">
                          <video src={portfolioItem.videos[0]} controls className="w-full" />
                        </div>
                      ) : null}

                      {/* Interaction Buttons */}
                      <div className="px-4 sm:px-5 pt-3 pb-2">
                        <div className="flex items-center gap-4 mb-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleLike(item.id)
                            }}
                            className={`transition-colors ${
                              portfolioItem.liked
                                ? 'text-brand-accent'
                                : 'text-graphite-secondary'
                            }`}
                          >
                            <FiHeart
                              size={24}
                              className={portfolioItem.liked ? 'fill-current' : ''}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const nextOpen = !portfolioItem.showComments
                              setCommentsOpen(item.id, nextOpen)
                              if (nextOpen) fetchAllComments(item.id)
                            }}
                            className="text-graphite-secondary transition-colors"
                          >
                            <FiMessageCircle size={24} />
                          </button>
                        </div>

                        {/* Likes Count */}
                        {portfolioItem.likes_count > 0 && (
                          <div className="text-sm font-semibold text-graphite-secondary mb-2">
                            {portfolioItem.likes_count}{' '}
                            {portfolioItem.likes_count === 1
                              ? 'лайк'
                              : portfolioItem.likes_count < 5
                              ? 'лайка'
                              : 'лайков'}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="px-4 sm:px-5 pb-3">
                        {portfolioItem.title && (
                          <div className="font-semibold text-base sm:text-lg text-graphite-secondary tracking-tight mb-1.5">
                            {portfolioItem.title}
                          </div>
                        )}
                        {portfolioItem.description && (
                          <p className="text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-wrap mb-2">
                            {portfolioItem.description}
                          </p>
                        )}

                        {/* Comments */}
                        {portfolioItem.comments && portfolioItem.comments.length > 0 && (
                          <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                            {!portfolioItem.showComments &&
                              portfolioItem.comments_count &&
                              portfolioItem.comments_count > portfolioItem.comments.length && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setCommentsOpen(item.id, true)
                                    fetchAllComments(item.id)
                                  }}
                                  className="text-sm text-text-secondary hover:text-text-primary mb-2"
                                >
                                  Показать все комментарии ({portfolioItem.comments_count})
                                </button>
                              )}

                            {portfolioItem.showComments ? (
                              <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                                {portfolioItem.comments.map((comment) => (
                                  <div key={comment.id} className="flex gap-2">
                                    <div className="flex-1">
                                      <span className="font-semibold text-sm text-graphite-secondary mr-2">
                                        {comment.user?.full_name || 'Пользователь'}
                                      </span>
                                      <span className="text-sm text-text-secondary">
                                        {comment.content}
                                      </span>
                                      <div className="text-xs text-text-muted mt-0.5">
                                        {format(new Date(comment.created_at), 'd MMMM', {
                                          locale: ru,
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-2 mb-2">
                                {portfolioItem.comments.slice(-2).map((comment) => (
                                  <div key={comment.id} className="flex gap-2">
                                    <div className="flex-1">
                                      <span className="font-semibold text-sm text-graphite-secondary mr-2">
                                        {comment.user?.full_name || 'Пользователь'}
                                      </span>
                                      <span className="text-sm text-text-secondary">
                                        {comment.content}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Comment Form */}
                        {user && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleSubmitComment(item.id)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 pt-2 border-t border-border-light/40"
                          >
                            <input
                              type="text"
                              value={commentTexts[item.id] || ''}
                              onChange={(e) =>
                                setCommentTexts({ ...commentTexts, [item.id]: e.target.value })
                              }
                              placeholder="Добавить комментарий..."
                              className="flex-1 text-sm bg-transparent border-none outline-none text-text-secondary placeholder-text-muted"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              type="submit"
                              disabled={
                                !commentTexts[item.id]?.trim() || submittingComments[item.id]
                              }
                              className={`transition-colors ${
                                commentTexts[item.id]?.trim() && !submittingComments[item.id]
                                  ? 'text-brand-accent'
                                  : 'text-text-muted'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FiSend size={18} />
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )
                } else if (item.type === 'product' && item.product) {
                  return (
                    <div key={item.id} id={`item-${item.id}`}>
                      <ProductCard product={item.product} currentUser={user} />
                    </div>
                  )
                }
                return null
              })}
            </div>
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
