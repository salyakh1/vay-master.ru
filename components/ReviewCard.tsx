'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User } from '@/lib/supabase'
import { FiUser, FiCamera, FiMessageCircle, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import RatingStars from './RatingStars'
import Link from 'next/link'

interface ReviewReply {
  id: string
  review_id: string
  review_type: 'master' | 'seller' | 'product'
  author_id: string
  content: string
  created_at: string
  updated_at?: string
  author?: User
}

interface BaseReview {
  id: string
  reviewer_id: string
  rating: number
  comment?: string
  images?: string[]
  created_at: string
  updated_at?: string
  reviewer?: User
  replies?: ReviewReply[]
}

type MasterReview = BaseReview & {
  master_id: string
  master?: User
}

type SellerReview = BaseReview & {
  seller_id: string
  seller?: User
}

type ProductReview = BaseReview & {
  product_id: string
  seller_id: string
  seller?: User
  product?: any
}

interface ReviewCardProps {
  review: MasterReview | SellerReview | ProductReview
  reviewType: 'master' | 'seller' | 'product'
  currentUser: User | null
  onReply?: (reviewId: string) => void
  onEdit?: (review: MasterReview | SellerReview | ProductReview) => void
  onDelete?: (reviewId: string) => void
  showReplies?: boolean
}

export default function ReviewCard({
  review,
  reviewType,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  showReplies = true,
}: ReviewCardProps) {
  const [showAllReplies, setShowAllReplies] = useState(false)
  const reviewer = 'reviewer' in review ? review.reviewer : null
  const replies = review.replies || []

  const timeAgo = format(new Date(review.created_at), 'd MMMM yyyy', { locale: ru })
  const isToday = new Date(review.created_at).toDateString() === new Date().toDateString()
  const isYesterday = new Date(review.created_at).toDateString() === new Date(Date.now() - 86400000).toDateString()
  
  let timeDisplay = timeAgo
  if (isToday) {
    timeDisplay = 'Сегодня'
  } else if (isYesterday) {
    timeDisplay = 'Вчера'
  }

  const isOwnReview = currentUser?.id === review.reviewer_id
  const canReply = currentUser && !isOwnReview && reviewType === 'master' ? (review as MasterReview).master_id === currentUser.id : false
  const canReplySeller = currentUser && !isOwnReview && reviewType === 'seller' ? (review as SellerReview).seller_id === currentUser.id : false
  const canReplyProduct = currentUser && !isOwnReview && reviewType === 'product' ? (review as ProductReview).seller_id === currentUser.id : false

  return (
    <div className={`card-glossy mb-4 relative ${isOwnReview ? 'border-2 border-red-500 shadow-red-200/50 shadow-lg bg-red-50/40' : ''}`}>
      <div className="flex gap-4">
        {/* Аватар рецензента */}
        <Link href={`/profile/${review.reviewer_id}`} className="flex-shrink-0">
          {reviewer?.avatar_url ? (
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-border-light/60">
              <Image
                src={reviewer.avatar_url}
                alt={reviewer.full_name}
                fill
                className="object-cover rounded-full"
                sizes="48px"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white font-semibold border-2 border-border-light/60">
              {reviewer?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </Link>

        {/* Контент отзыва */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link href={`/profile/${review.reviewer_id}`} className="block">
                  <h4 className="font-semibold text-graphite-secondary hover:text-brand-accent transition-colors truncate">
                    {reviewer?.full_name || 'Пользователь'}
                  </h4>
                </Link>
                {isOwnReview && (
                  <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm flex-shrink-0">
                    Ваш отзыв
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <RatingStars rating={review.rating} size="sm" readonly />
                <span className="text-xs text-text-secondary">{timeDisplay}</span>
              </div>
            </div>

            {/* Действия владельца отзыва */}
            {isOwnReview && (
              <div className="flex items-center gap-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(review)}
                    className="p-1.5 text-text-secondary hover:text-brand-accent transition-colors"
                    title="Редактировать"
                  >
                    <FiEdit2 size={16} />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(review.id)}
                    className="p-1.5 text-text-secondary hover:text-red-500 transition-colors"
                    title="Удалить"
                  >
                    <FiTrash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Текст отзыва */}
          {review.comment && (
            <p className="text-sm text-text-primary leading-relaxed mb-3 whitespace-pre-wrap">
              {review.comment}
            </p>
          )}

          {/* Фото отзыва */}
          {review.images && review.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {review.images.slice(0, 3).map((img: string, idx: number) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border-light/60 bg-bg-secondary group/image"
                >
                  <Image
                    src={img}
                    alt={`Фото ${idx + 1}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover/image:scale-110 rounded-lg"
                    sizes="(max-width: 768px) 33vw, 150px"
                    loading="lazy"
                  />
                </div>
              ))}
              {review.images.length > 3 && (
                <div className="aspect-square rounded-lg border border-border-light/60 bg-bg-secondary flex items-center justify-center text-xs text-text-secondary">
                  +{review.images.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Кнопка ответа (для мастера/продавца) */}
          {(canReply || canReplySeller || canReplyProduct) && onReply && (
            <button
              onClick={() => onReply(review.id)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-brand-accent transition-colors mt-2"
            >
              <FiMessageCircle size={14} />
              <span>Ответить</span>
            </button>
          )}

          {/* Ответы на отзыв */}
          {showReplies && replies.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border-light/40">
              {replies.slice(0, showAllReplies ? replies.length : 2).map((reply: any) => (
                <div key={reply.id} className="mb-3 last:mb-0 pl-4 border-l-2 border-border-light/40">
                  <div className="flex items-start gap-2 mb-1">
                    <Link href={`/profile/${reply.author_id}`} className="font-medium text-sm text-graphite-secondary hover:text-brand-accent transition-colors">
                      {reply.author?.full_name || 'Пользователь'}
                    </Link>
                    <span className="text-xs text-text-secondary">
                      {format(new Date(reply.created_at), 'd MMM yyyy', { locale: ru })}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {reply.content}
                  </p>
                </div>
              ))}
              {replies.length > 2 && !showAllReplies && (
                <button
                  onClick={() => setShowAllReplies(true)}
                  className="text-xs text-brand-accent hover:text-brand-accent-hover mt-2"
                >
                  Показать все ответы ({replies.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
