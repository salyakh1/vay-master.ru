'use client'

import { useState } from 'react'
import { FiStar } from 'react-icons/fi'

interface RatingStarsProps {
  rating: number // Текущий рейтинг (0-5)
  onRatingChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
  showValue?: boolean
  className?: string
}

export default function RatingStars({
  rating,
  onRatingChange,
  size = 'md',
  readonly = false,
  showValue = false,
  className = '',
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayRating
          const isHalf = star - 0.5 === displayRating

          return (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              onMouseEnter={() => !readonly && setHoverRating(star)}
              onMouseLeave={() => !readonly && setHoverRating(0)}
              disabled={readonly}
              className={`transition-all duration-200 ${
                readonly ? 'cursor-default' : 'cursor-pointer hover:scale-125 active:scale-110'
              } ${sizeClasses[size]} p-0.5`}
            >
              <FiStar
                className={`transition-all duration-200 ${
                  isFilled
                    ? 'fill-brand-accent text-brand-accent drop-shadow-md'
                    : 'fill-transparent text-graphite-tertiary/70 stroke-2'
                }`}
                strokeWidth={isFilled ? 0 : 3}
              />
            </button>
          )
        })}
      </div>
      {showValue && rating > 0 && (
        <span className="text-sm font-medium text-graphite-secondary ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
