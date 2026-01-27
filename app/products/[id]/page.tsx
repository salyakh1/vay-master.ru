'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/app/providers'
import { supabase, Product } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiMessageCircle, FiShoppingCart, FiChevronLeft, FiChevronRight, FiArrowLeft, FiUser } from 'react-icons/fi'
import Link from 'next/link'
import AuthRequiredModal from '@/components/AuthRequiredModal'
import ReviewCard from '@/components/ReviewCard'
import ReviewForm from '@/components/ReviewForm'
import ReviewReplyForm from '@/components/ReviewReplyForm'
import RatingStars from '@/components/RatingStars'
import ProductComments from '@/components/ProductComments'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const replyTo = searchParams.get('replyTo')
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImage, setActiveImage] = useState<number>(0)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [productReviews, setProductReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [editingReview, setEditingReview] = useState<any>(null)
  const [replyingToReview, setReplyingToReview] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true)
    }
  }, [user, authLoading])

  useEffect(() => {
    if (params.id) {
      fetchProduct()
      fetchProductReviews()
    }
  }, [params.id])

  const fetchProductReviews = async () => {
    if (!params.id) return
    try {
      setReviewsLoading(true)
      const productId = Array.isArray(params.id) ? params.id[0] : params.id
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id(id, full_name, avatar_url, role),
          seller:profiles!seller_id(id, full_name),
          product:products!product_id(id, name)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      // Получаем ответы на отзывы
      const reviewIds = data?.map(r => r.id) || []
      if (reviewIds.length > 0) {
        const { data: replies } = await supabase
          .from('review_replies')
          .select(`
            *,
            author:profiles!author_id(id, full_name, avatar_url)
          `)
          .eq('review_type', 'product')
          .in('review_id', reviewIds)
          .order('created_at', { ascending: true })

        const repliesMap = new Map<string, any[]>()
        replies?.forEach(reply => {
          if (!repliesMap.has(reply.review_id)) {
            repliesMap.set(reply.review_id, [])
          }
          repliesMap.get(reply.review_id)!.push(reply)
        })

        const reviewsWithReplies = data?.map(review => ({
          ...review,
          replies: repliesMap.get(review.id) || []
        })) || []

        setProductReviews(reviewsWithReplies)
      } else {
        setProductReviews([])
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error)
      setProductReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!product) return
    
    const images = product.images || []
    if (images.length <= 1) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setActiveImage((prev) => (prev - 1 + images.length) % images.length)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setActiveImage((prev) => (prev + 1) % images.length)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [product])

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles(id, full_name, avatar_url, city, phone, description),
          category_ref:product_categories(id, name, section, slug),
          subcategory_ref:product_subcategories(id, name, slug, category_id)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setProduct(data as Product)
    } catch (error) {
      console.error('Error fetching product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContact = async () => {
    if (!user || !product) return

    const seller = product.seller as any
    try {
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${seller.id}),and(user1_id.eq.${seller.id},user2_id.eq.${user.id})`)
        .single()

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`)
      } else {
        const { data } = await supabase
          .from('chats')
          .insert({
            user1_id: user.id,
            user2_id: seller.id,
          })
          .select()
          .single()

        if (data) {
          router.push(`/chats/${data.id}`)
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error)
    }
  }

  const nextImage = () => {
    if (!product) return
    const images = product.images || []
    if (images.length > 0) {
      setActiveImage((prev) => (prev + 1) % images.length)
    }
  }

  const prevImage = () => {
    if (!product) return
    const images = product.images || []
    if (images.length > 0) {
      setActiveImage((prev) => (prev - 1 + images.length) % images.length)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length > 0) {
      touchStartX.current = e.touches[0].clientX
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    // В touchEnd используем changedTouches, так как touches уже пуст
    if (e.changedTouches && e.changedTouches.length > 0) {
      touchEndX.current = e.changedTouches[0].clientX
      handleSwipe()
    }
  }

  const handleSwipe = () => {
    const diff = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swipe left - next image
        nextImage()
      } else {
        // Swipe right - previous image
        prevImage()
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!product || !user) return null

  const seller = product.seller as any
  const isOwner = user.id === seller.id
  const images = product.images || []
  const mainImage = images[activeImage] || images[0]

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
          >
            <FiArrowLeft size={20} />
            <span>Назад к товарам</span>
          </Link>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Product Images */}
            <div>
              <div 
                ref={imageContainerRef}
                className="relative bg-white border border-gray-200 overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {mainImage ? (
                  <Image
                    src={mainImage}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-200 flex items-center justify-center text-6xl">
                  </div>
                )}
                
                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors"
                      aria-label="Предыдущее фото"
                    >
                      <FiChevronLeft size={24} />
                    </button>
                    <button
                      type="button"
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors"
                      aria-label="Следующее фото"
                    >
                      <FiChevronRight size={24} />
                    </button>
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                      {activeImage + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
              
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="mt-3 overflow-x-auto">
                  <div className="flex gap-2">
                    {images.map((img, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`w-16 h-16 border-2 ${idx === activeImage ? 'border-black' : 'border-gray-200'} overflow-hidden flex-shrink-0 transition-colors relative`}
                      >
                        <Image src={img} alt={`thumb-${idx}`} fill className="object-cover" sizes="64px" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <div className="card mb-6">
                <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
                <div className="text-4xl font-bold text-blue-600 mb-4">
                  {product.price.toLocaleString('ru-RU')} ₽
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <span className="text-sm text-gray-500">Категория:</span>
                    <div className="font-medium">
                      {product.category_ref?.name || product.category || '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Наличие:</span>
                    <div className="font-medium">
                      {product.in_stock ? (
                        <span className="text-green-600">В наличии</span>
                      ) : (
                        <span className="text-red-600">Нет в наличии</span>
                      )}
                    </div>
                  </div>
                  {product.stock_count !== null && (
                    <div>
                      <span className="text-sm text-gray-500">Остаток:</span>
                      <div className="font-medium">{product.stock_count} шт.</div>
                    </div>
                  )}
                </div>

                {!isOwner && (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <button
                        onClick={handleContact}
                        className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                      >
                        <FiMessageCircle size={18} strokeWidth={2.5} />
                        Написать продавцу
                      </button>
                      <Link
                        href={`/profile/${seller.id}`}
                        className="btn btn-outline flex items-center justify-center gap-2 px-6"
                      >
                        <FiUser size={18} strokeWidth={2.5} />
                        Профиль
                      </Link>
                    </div>
                    {user.role !== 'seller' && (
                      <button className="w-full btn btn-secondary flex items-center justify-center gap-2">
                        <FiShoppingCart size={18} strokeWidth={2.5} />
                        В корзину
                      </button>
                    )}
                  </div>
                )}

                {isOwner && (
                  <Link
                    href={`/products/${product.id}/edit`}
                    className="btn btn-outline w-full"
                  >
                    Редактировать товар
                  </Link>
                )}
              </div>

              {/* Seller Info */}
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">Продавец</h2>
                <Link href={`/profile/${seller.id}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-black border border-gray-200 flex items-center justify-center text-white text-sm font-bold">
                      {seller.avatar_url ? (
                        <img
                          src={seller.avatar_url}
                          alt={seller.full_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        seller.full_name[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {seller.full_name}
                      </div>
                      {seller.city && (
                        <div className="text-sm text-gray-500">{seller.city}</div>
                      )}
                    </div>
                  </div>
                </Link>
                {seller.phone && (
                  <div className="text-sm text-gray-600 mb-2">
                    Телефон: {seller.phone}
                  </div>
                )}
                {seller.description && (
                  <p className="text-sm text-gray-600">{seller.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card mt-8">
            <h2 className="text-xl font-semibold mb-4">Описание</h2>
            <div className="whitespace-pre-wrap text-gray-700">
              {product.description}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="card mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Отзывы о товаре</h2>
                {product.rating && product.reviews_count ? (
                  <div className="flex items-center gap-2">
                    <RatingStars rating={product.rating} size="sm" readonly showValue />
                    <span className="text-sm text-gray-500">
                      ({product.reviews_count} {product.reviews_count === 1 ? 'отзыв' : product.reviews_count < 5 ? 'отзыва' : 'отзывов'})
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Пока нет отзывов</p>
                )}
              </div>
              {user && !isOwner && (
                <button
                  onClick={() => {
                    setShowReviewForm(true)
                    setEditingReview(null)
                  }}
                  className="btn btn-primary text-sm w-full sm:w-auto"
                >
                  Оставить отзыв
                </button>
              )}
            </div>

            {/* Форма отзыва */}
            {showReviewForm && user && !isOwner && (
              <div className="mb-6">
                <ReviewForm
                  targetId={Array.isArray(params.id) ? params.id[0] : params.id}
                  targetType="product"
                  sellerId={seller.id}
                  currentUserId={user.id}
                  existingReview={editingReview}
                  onSuccess={() => {
                    setShowReviewForm(false)
                    setEditingReview(null)
                    fetchProductReviews()
                    fetchProduct()
                  }}
                  onCancel={() => {
                    setShowReviewForm(false)
                    setEditingReview(null)
                  }}
                />
              </div>
            )}

            {/* Список отзывов */}
            {reviewsLoading ? (
              <div className="text-center text-gray-500 py-10">
                Загрузка отзывов...
              </div>
            ) : productReviews.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                Пока нет отзывов
              </div>
            ) : (
              <div className="space-y-4">
                {productReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    reviewType="product"
                    currentUser={user}
                    onReply={(reviewId) => setReplyingToReview(replyingToReview === reviewId ? null : reviewId)}
                    onEdit={(review) => {
                      setEditingReview(review)
                      setShowReviewForm(true)
                    }}
                    onDelete={async (reviewId) => {
                      if (confirm('Вы уверены, что хотите удалить отзыв?')) {
                        try {
                          const { error } = await supabase
                            .from('product_reviews')
                            .delete()
                            .eq('id', reviewId)
                          if (error) throw error
                          fetchProductReviews()
                          fetchProduct()
                        } catch (error) {
                          console.error('Error deleting review:', error)
                          alert('Ошибка при удалении отзыва')
                        }
                      }
                    }}
                  />
                ))}
                {replyingToReview && user && (
                  <ReviewReplyForm
                    reviewId={replyingToReview}
                    reviewType="product"
                    currentUserId={user.id}
                    onSuccess={() => {
                      setReplyingToReview(null)
                      fetchProductReviews()
                    }}
                    onCancel={() => setReplyingToReview(null)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Комментарии к товару (отдельно от отзывов) */}
          {product && (
            <ProductComments
              productId={product.id}
              currentUser={user}
              openReplyToId={replyTo || undefined}
            />
          )}
        </div>
      </div>

      {/* Auth Required Modal */}
      <AuthRequiredModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        type="product"
      />
    </div>
  )
}

