'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/app/providers'
import { supabase, Product } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { FiChevronLeft, FiChevronRight, FiArrowLeft, FiPhone, FiEdit2 } from 'react-icons/fi'
import Link from 'next/link'
import AuthRequiredModal from '@/components/AuthRequiredModal'
import GuestAwareProfileLink from '@/components/GuestAwareProfileLink'
import { loginUrl, sanitizeProductForGuest } from '@/lib/guest-access'
import ReviewCard from '@/components/ReviewCard'
import ReviewForm from '@/components/ReviewForm'
import ReviewReplyForm from '@/components/ReviewReplyForm'
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
          seller:profiles(id, full_name, avatar_url, city, store_address, phone, description, seller_rating, seller_reviews_count),
          category_ref:product_categories(id, name, section, slug),
          subcategory_ref:product_subcategories(id, name, slug, category_id)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      const { data: { session } } = await supabase.auth.getSession()
      setProduct(sanitizeProductForGuest(data as Product, !!session?.user))
    } catch (error) {
      console.error('Error fetching product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContact = async () => {
    if (!product) return
    const productId = Array.isArray(params.id) ? params.id[0] : params.id
    if (!user) {
      router.push(loginUrl(productId ? `/products/${productId}` : '/products'))
      return
    }

    const seller = product.seller as { id: string }
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
      <div className="min-h-screen bg-[#F4F4F4] max-w-lg mx-auto w-full pb-24 flex items-center justify-center">
        <div className="text-[13px] text-[#9ca3af]">Загрузка…</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F4F4F4] max-w-lg mx-auto w-full pb-24 flex items-center justify-center px-4">
        <p className="text-[13px] text-[#9ca3af]">Товар не найден</p>
      </div>
    )
  }

  const seller = product.seller as {
    id: string
    full_name?: string
    avatar_url?: string
    city?: string
    store_address?: string
    phone?: string
    description?: string
    seller_rating?: number
    seller_reviews_count?: number
  }
  const isOwner = user?.id === seller.id
  const images = product.images || []
  const mainImage = images[activeImage] || images[0]
  const categoryName = product.category_ref?.name || product.category || ''
  const sellerInitials =
    seller.full_name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  const firstReview = productReviews[0]
  const stockLabel = product.in_stock
    ? product.stock_count != null
      ? `В наличии · ${product.stock_count} шт`
      : 'В наличии'
    : 'Нет в наличии'

  return (
    <div className="min-h-screen bg-[#F4F4F4] max-w-lg mx-auto w-full pb-24">
      <Navbar />

      {/* Gallery */}
      <div
        ref={imageContainerRef}
        className="relative h-[220px] bg-[#E8E8E8]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {mainImage ? (
          <Image src={mainImage} alt={product.name} fill className="object-cover" sizes="100vw" priority />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#ccc] text-sm">Нет фото</div>
        )}

        <button
          type="button"
          onClick={() => router.back()}
          className="absolute top-2.5 left-2.5 w-[30px] h-[30px] rounded-full bg-white/85 flex items-center justify-center text-[#111]"
          aria-label="Назад"
        >
          <FiArrowLeft size={16} />
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
              aria-label="Предыдущее"
            >
              <FiChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
              aria-label="Следующее"
            >
              <FiChevronRight size={18} />
            </button>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`h-1 rounded-full transition-all ${
                    idx === activeImage ? 'w-3.5 bg-white' : 'w-1 bg-white/50'
                  }`}
                  aria-label={`Фото ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sheet */}
      <div className="relative -mt-3.5 bg-white rounded-t-2xl px-3.5 pt-4 pb-6">
        <span
          className={`inline-block text-[9px] font-medium px-2 py-0.5 rounded-md ${
            product.in_stock ? 'bg-[#EAF3DE] text-[#27500A]' : 'bg-[#fdedec] text-brand-accent'
          }`}
        >
          {stockLabel}
        </span>

        <p className="text-[22px] font-medium text-brand-accent mt-2 mb-1.5">
          {product.price.toLocaleString('ru-RU')} ₽
        </p>
        <h1 className="text-[14px] font-medium text-[#111] leading-snug mb-1">{product.name}</h1>
        {categoryName && <p className="text-[10px] text-[#9ca3af] mb-3.5">{categoryName}</p>}

        <GuestAwareProfileLink
          profileId={seller.id}
          className="flex items-center gap-2.5 p-2.5 bg-[#F4F4F4] rounded-xl mb-3.5"
        >
          <div className="w-9 h-9 rounded-full bg-[#1d5fa6] overflow-hidden flex items-center justify-center text-white text-[13px] font-medium flex-shrink-0">
            {seller.avatar_url ? (
              <Image src={seller.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full" />
            ) : (
              sellerInitials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[#111] truncate">{seller.full_name || 'Продавец'}</p>
            <p className="text-[10px] text-[#6b7280] flex items-center gap-1">
              {seller.seller_rating != null && seller.seller_rating > 0 && (
                <>
                  <span className="text-[#EAB308]">★</span>
                  <span>{seller.seller_rating.toFixed(1)}</span>
                  <span>·</span>
                </>
              )}
              <span>{seller.city || seller.store_address || 'Город не указан'}</span>
            </p>
          </div>
          <span className="text-[#9ca3af] text-lg">›</span>
        </GuestAwareProfileLink>

        {!isOwner ? (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={handleContact}
              className="flex-1 bg-brand-accent text-white text-[12px] font-medium py-2.5 rounded-[10px] text-center"
            >
              Написать продавцу
            </button>
            {user && seller.phone ? (
              <a
                href={`tel:${seller.phone}`}
                className="w-[42px] bg-[#F4F4F4] border border-[#E5E7EB] rounded-[10px] flex items-center justify-center text-[#111]"
                aria-label="Позвонить"
              >
                <FiPhone size={16} />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!user) setShowAuthModal(true)
                }}
                className="w-[42px] bg-[#F4F4F4] border border-[#E5E7EB] rounded-[10px] flex items-center justify-center text-[#111]"
                aria-label="Телефон"
              >
                <FiPhone size={16} />
              </button>
            )}
          </div>
        ) : (
          <Link
            href={`/products/${product.id}/edit`}
            className="mb-4 flex items-center justify-center gap-1.5 w-full bg-[#F4F4F4] border border-[#E5E7EB] text-[#111] text-[12px] font-medium py-2.5 rounded-[10px]"
          >
            <FiEdit2 size={14} />
            Редактировать товар
          </Link>
        )}

        {product.description && (
          <>
            <p className="text-[11px] font-medium text-[#9ca3af] uppercase mb-1.5">Описание</p>
            <p className="text-[12px] text-[#374151] leading-relaxed mb-4 whitespace-pre-wrap">{product.description}</p>
          </>
        )}

        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-medium text-[#9ca3af] uppercase">
            Отзывы{product.reviews_count ? ` · ${product.reviews_count}` : productReviews.length ? ` · ${productReviews.length}` : ''}
          </p>
          {user && !isOwner && (
            <button
              type="button"
              onClick={() => {
                setShowReviewForm(true)
                setEditingReview(null)
              }}
              className="text-[11px] font-medium text-brand-accent"
            >
              Оставить
            </button>
          )}
        </div>

        {reviewsLoading ? (
          <p className="text-[11px] text-[#9ca3af] mb-3">Загрузка…</p>
        ) : firstReview ? (
          <div className="flex items-start gap-1.5 mb-3">
            <span className="text-[#EAB308] text-[12px]">★</span>
            <span className="text-[12px] font-medium text-[#111]">
              {(product.rating ?? firstReview.rating)?.toFixed?.(1) ?? firstReview.rating}
            </span>
            {firstReview.comment && (
              <span className="text-[11px] text-[#9ca3af] line-clamp-1">— {firstReview.comment}</span>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-[#9ca3af] mb-3">Пока нет отзывов</p>
        )}

        {showReviewForm && user && !isOwner && (
          <div className="mb-4">
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

        {productReviews.length > 0 && (
          <div className="space-y-3 mb-4 border-t border-[#f0f0f0] pt-3">
            {productReviews.slice(0, 5).map((review) => (
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
                  if (!confirm('Удалить отзыв?')) return
                  try {
                    const { error } = await supabase.from('product_reviews').delete().eq('id', reviewId)
                    if (error) throw error
                    fetchProductReviews()
                    fetchProduct()
                  } catch (e) {
                    console.error(e)
                    alert('Ошибка при удалении')
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

        {product && (
          <ProductComments
            productId={product.id}
            currentUser={user}
            openReplyToId={replyTo || undefined}
          />
        )}
      </div>

      <AuthRequiredModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} type="product" />
    </div>
  )
}

