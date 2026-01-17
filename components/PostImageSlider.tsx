'use client'

import { useState, useRef } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface PostImageSliderProps {
  images: string[]
  alt?: string
  className?: string
}

export default function PostImageSlider({ images, alt = '', className = '' }: PostImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)

  if (!images || images.length === 0) return null

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  // Свайп на мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Свайп влево - следующее
        goToNext()
      } else {
        // Свайп вправо - предыдущее
        goToPrevious()
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Контейнер изображения */}
      <div
        className="relative w-full overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Изображение */}
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((img, index) => (
            <div key={index} className="w-full flex-shrink-0">
              <img
                src={img}
                alt={`${alt} ${index + 1}`}
                className="w-full h-auto object-contain max-h-[600px] mx-auto"
              />
            </div>
          ))}
        </div>

        {/* Индикатор количества в правом верхнем углу (как в Instagram) */}
        {images.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Кнопки навигации (только для десктопа) */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevious()
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors hidden md:block"
              aria-label="Предыдущее фото"
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors hidden md:block"
              aria-label="Следующее фото"
            >
              <FiChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* Точки-индикаторы внизу (как в Instagram) */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-graphite-secondary w-6'
                  : 'bg-border-color w-1.5'
              }`}
              aria-label={`Перейти к фото ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
