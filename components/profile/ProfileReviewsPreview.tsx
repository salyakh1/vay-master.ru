'use client'

import RatingStars from '@/components/RatingStars'

type ReviewPreview = {
  id: string
  rating?: number
  comment?: string | null
  reviewer?: { full_name?: string | null }
}

type ProfileReviewsPreviewProps = {
  reviews: ReviewPreview[]
  totalCount: number
  loading?: boolean
  onShowAll: () => void
}

export default function ProfileReviewsPreview({
  reviews,
  totalCount,
  loading,
  onShowAll,
}: ProfileReviewsPreviewProps) {
  const first = reviews[0]
  const count = totalCount || reviews.length

  return (
    <div className="bg-white mt-2 px-3.5 py-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[13px] font-medium text-[#111111]">
          Отзывы{count > 0 ? ` · ${count}` : ''}
        </p>
        {count > 0 && (
          <button
            type="button"
            onClick={onShowAll}
            className="text-[11px] font-medium text-brand-accent"
          >
            Все →
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-[11px] text-[#9ca3af]">Загрузка…</p>
      ) : count === 0 ? (
        <p className="text-[11px] text-[#9ca3af]">Пока нет отзывов</p>
      ) : first ? (
        <div className="border-t border-[#e5e7eb] pt-2">
          <div className="flex items-center gap-1.5 mb-1">
            <RatingStars rating={first.rating ?? 0} readonly size="sm" />
            <span className="text-[11px] font-medium text-[#111111]">
              {first.reviewer?.full_name || 'Клиент'}
            </span>
          </div>
          {first.comment && (
            <p className="text-[11px] text-[#6b7280] leading-relaxed line-clamp-3">{first.comment}</p>
          )}
        </div>
      ) : (
        <button type="button" onClick={onShowAll} className="text-[11px] text-brand-accent">
          Смотреть отзывы
        </button>
      )}
    </div>
  )
}
