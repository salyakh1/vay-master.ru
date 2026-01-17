'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../providers'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/admin'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiTrash2, FiEye, FiEyeOff, FiSearch, FiFilter, FiStar } from 'react-icons/fi'
import RatingStars from '@/components/RatingStars'
import Link from 'next/link'

type ReviewType = 'master' | 'product'

interface MasterReview {
  id: string
  master_id: string
  reviewer_id: string
  rating: number
  comment?: string
  images?: string[]
  created_at: string
  reviewer?: any
  master?: any
}

interface ProductReview {
  id: string
  product_id: string
  reviewer_id: string
  seller_id: string
  rating: number
  comment?: string
  images?: string[]
  created_at: string
  reviewer?: any
  seller?: any
  product?: any
}

type Review = MasterReview | ProductReview

export default function AdminReviewsPage() {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<ReviewType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      fetchReviews()
    }
  }, [user, filterType])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const allReviews: Review[] = []

      // Загружаем отзывы о мастерах
      if (filterType === 'all' || filterType === 'master') {
        const { data: masterReviews, error: masterError } = await supabase
          .from('master_reviews')
          .select(`
            *,
            reviewer:profiles!reviewer_id(id, full_name, avatar_url, email),
            master:profiles!master_id(id, full_name, avatar_url)
          `)
          .order('created_at', { ascending: false })

        if (masterError) throw masterError
        if (masterReviews) {
          allReviews.push(...(masterReviews as MasterReview[]))
        }
      }

      // Загружаем отзывы о товарах
      if (filterType === 'all' || filterType === 'product') {
        const { data: productReviews, error: productError } = await supabase
          .from('product_reviews')
          .select(`
            *,
            reviewer:profiles!reviewer_id(id, full_name, avatar_url, email),
            seller:profiles!seller_id(id, full_name, avatar_url),
            product:products!product_id(id, name)
          `)
          .order('created_at', { ascending: false })

        if (productError) throw productError
        if (productReviews) {
          allReviews.push(...(productReviews as ProductReview[]))
        }
      }

      // Сортируем по дате (новые сначала)
      allReviews.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setReviews(allReviews)
    } catch (error) {
      console.error('Error fetching reviews:', error)
      alert('Ошибка при загрузке отзывов')
    } finally {
      setLoading(false)
    }
  }

  const deleteReview = async (review: Review) => {
    if (!confirm(`Вы уверены, что хотите удалить этот отзыв? Это действие необратимо.`)) return

    setDeleting(true)
    try {
      const tableName = 'master_id' in review ? 'master_reviews' : 'product_reviews'
      const reviewType = 'master_id' in review ? 'master' : 'product'
      
      // Сначала удаляем связанные ответы (replies)
      const { error: repliesError } = await supabase
        .from('review_replies')
        .delete()
        .eq('review_id', review.id)
        .eq('review_type', reviewType)

      if (repliesError) {
        console.warn('Error deleting review replies:', repliesError)
        // Продолжаем удаление отзыва, даже если ответы не удалились
      }

      // Затем удаляем сам отзыв
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', review.id)

      if (error) {
        console.error('Error deleting review:', error)
        throw error
      }

      // Логируем действие админа
      if (user) {
        await logAdminAction(user.id, 'delete_review', tableName, review.id, {
          review_type: reviewType,
          reviewer_id: review.reviewer_id,
        })
      }

      // Обновляем список отзывов
      await fetchReviews()
      
      setSelectedReview(null)
      alert('Отзыв успешно удален')
    } catch (error: any) {
      console.error('Error deleting review:', error)
      alert(`Ошибка при удалении отзыва: ${error.message || 'Неизвестная ошибка'}`)
    } finally {
      setDeleting(false)
    }
  }

  // Фильтрация отзывов
  const filteredReviews = reviews.filter(review => {
    // Фильтр по типу
    if (filterType !== 'all') {
      const isMaster = 'master_id' in review
      if (filterType === 'master' && !isMaster) return false
      if (filterType === 'product' && isMaster) return false
    }

    // Фильтр по рейтингу
    if (ratingFilter !== 'all' && review.rating !== ratingFilter) return false

    // Поиск по тексту
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const reviewerName = review.reviewer?.full_name?.toLowerCase() || ''
      const comment = review.comment?.toLowerCase() || ''
      const targetName = 'master_id' in review 
        ? review.master?.full_name?.toLowerCase() || ''
        : (review.product?.name?.toLowerCase() || '')

      if (!reviewerName.includes(query) && !comment.includes(query) && !targetName.includes(query)) {
        return false
      }
    }

    return true
  })

  const getReviewType = (review: Review): ReviewType => {
    return 'master_id' in review ? 'master' : 'product'
  }

  const getReviewTarget = (review: Review) => {
    if ('master_id' in review) {
      return {
        type: 'master' as const,
        id: review.master_id,
        name: review.master?.full_name || 'Мастер',
        link: `/profile/${review.master_id}`
      }
    } else {
      return {
        type: 'product' as const,
        id: review.product_id,
        name: review.product?.name || 'Товар',
        link: `/products/${review.product_id}`
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Загрузка отзывов...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-graphite-secondary">Управление отзывами</h1>
          <p className="text-sm text-text-secondary mt-1">
            Всего отзывов: {reviews.length} | Отфильтровано: {filteredReviews.length}
          </p>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Поиск */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по автору, тексту..."
              className="input pl-10 w-full"
            />
          </div>

          {/* Фильтр по типу */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ReviewType | 'all')}
              className="input w-full"
            >
              <option value="all">Все отзывы</option>
              <option value="master">О мастерах</option>
              <option value="product">О товарах</option>
            </select>
          </div>

          {/* Фильтр по рейтингу */}
          <div>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="input w-full"
            >
              <option value="all">Все рейтинги</option>
              <option value="5">5 звезд</option>
              <option value="4">4 звезды</option>
              <option value="3">3 звезды</option>
              <option value="2">2 звезды</option>
              <option value="1">1 звезда</option>
            </select>
          </div>
        </div>
      </div>

      {/* Список отзывов */}
      {filteredReviews.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-text-secondary">Отзывы не найдены</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const target = getReviewTarget(review)
            const reviewer = review.reviewer

            return (
              <div
                key={review.id}
                className="card hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedReview(selectedReview?.id === review.id ? null : review)}
              >
                <div className="flex items-start gap-4">
                  {/* Аватар рецензента */}
                  <Link href={`/profile/${review.reviewer_id}`} onClick={(e) => e.stopPropagation()}>
                    {reviewer?.avatar_url ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border-light">
                        <img
                          src={reviewer.avatar_url}
                          alt={reviewer.full_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white font-semibold border-2 border-border-light">
                        {reviewer?.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </Link>

                  {/* Информация об отзыве */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/profile/${review.reviewer_id}`} 
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-graphite-secondary hover:text-brand-accent transition-colors"
                        >
                          {reviewer?.full_name || 'Пользователь'}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <RatingStars rating={review.rating} size="sm" readonly />
                          <span className="text-xs text-text-secondary">
                            {format(new Date(review.created_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                          </span>
                        </div>
                      </div>

                      {/* Действия */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteReview(review)
                          }}
                          disabled={deleting}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Удалить отзыв"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Текст отзыва */}
                    {review.comment && (
                      <p className="text-sm text-text-primary leading-relaxed mb-2 whitespace-pre-wrap">
                        {review.comment}
                      </p>
                    )}

                    {/* Информация об объекте отзыва */}
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="font-medium">
                        {target.type === 'master' ? 'О мастере:' : 'О товаре:'}
                      </span>
                      <Link
                        href={target.link}
                        onClick={(e) => e.stopPropagation()}
                        className="text-brand-accent hover:text-brand-accent-hover"
                      >
                        {target.name}
                      </Link>
                    </div>

                    {/* Фото отзыва (если есть) */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {review.images.slice(0, 3).map((img: string, idx: number) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Фото ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-border-light"
                          />
                        ))}
                        {review.images.length > 3 && (
                          <div className="w-16 h-16 bg-bg-secondary rounded-lg border border-border-light flex items-center justify-center text-xs text-text-secondary">
                            +{review.images.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
