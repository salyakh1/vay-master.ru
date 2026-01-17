'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AdBanner } from '@/lib/supabase'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface AdBannerSliderProps {
  page: 'home' | 'search' | 'orders' | 'products' | 'feed'
  autoplay?: boolean
  interval?: number
  className?: string
}

export default function AdBannerSlider({
  page,
  autoplay = true,
  interval = 5000,
  className = '',
}: AdBannerSliderProps) {
  const router = useRouter()
  const [banners, setBanners] = useState<AdBanner[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const trackedViewsRef = useRef<Set<string>>(new Set()) // Отслеживаем уже отправленные просмотры
  const trackViewTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Отслеживание просмотров с защитой от дублирования
  // ВАЖНО: Используем useRef для стабильной функции, которая не меняется
  const trackViewRef = useRef<((bannerId: string) => void) | null>(null)
  
  // Инициализируем функцию отслеживания один раз
  useEffect(() => {
    trackViewRef.current = async (bannerId: string) => {
      if (!bannerId) return
      
      // Если уже отследили этот баннер, не отправляем повторно
      if (trackedViewsRef.current.has(bannerId)) {
        return
      }
      
      // Отмечаем как отслеженный СРАЗУ, чтобы избежать дублирования
      trackedViewsRef.current.add(bannerId)
      
      // Очищаем предыдущий таймаут
      if (trackViewTimeoutRef.current) {
        clearTimeout(trackViewTimeoutRef.current)
      }
      
      // Debounce: отправляем запрос с задержкой 2 секунды для накопления
      trackViewTimeoutRef.current = setTimeout(async () => {
        try {
          // Создаем AbortController для таймаута
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 5000)
          
          const response = await fetch(`/api/banners/${bannerId}/view`, { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            // Если ошибка, убираем из отслеженных только если это не сетевой сбой
            if (response.status >= 500) {
              trackedViewsRef.current.delete(bannerId)
            }
          }
        } catch (error: any) {
          // Игнорируем ошибки отмены
          if (error?.name === 'AbortError') {
            // Запрос был отменен - это нормально
            return
          }
          // Для других ошибок просто игнорируем, не логируем
          // чтобы не засорять консоль
        }
      }, 2000) // Увеличена задержка до 2 секунд
    }
  }, [])
  
  // Обертка для вызова
  const trackView = useCallback((bannerId: string) => {
    if (trackViewRef.current) {
      trackViewRef.current(bannerId)
    }
  }, [])

  // Загрузка баннеров
  useEffect(() => {
    const fetchBanners = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/banners?page=${page}&limit=10`)
        if (!response.ok) {
          console.error('Failed to fetch banners:', response.status, response.statusText)
          setBanners([])
          setLoading(false)
          return
        }
        const data = await response.json()
        console.log('Banners fetched:', data.banners?.length || 0, 'banners for page:', page)
        if (data.banners && data.banners.length > 0) {
          setBanners(data.banners)
          // Отслеживаем просмотр первого баннера
          trackView(data.banners[0].id)
        } else {
          console.log('No banners found for page:', page)
          setBanners([])
        }
      } catch (error) {
        console.error('Error fetching banners:', error)
        setBanners([])
      } finally {
        setLoading(false)
      }
    }

    fetchBanners()
    // Очищаем отслеженные просмотры при смене страницы
    trackedViewsRef.current.clear()
    
    return () => {
      // Очищаем таймаут при размонтировании
      if (trackViewTimeoutRef.current) {
        clearTimeout(trackViewTimeoutRef.current)
      }
    }
  }, [page]) // Убрали trackView из зависимостей

  // Автопрокрутка с индивидуальным временем для каждого баннера
  useEffect(() => {
    if (!autoplay || banners.length <= 1 || isPaused) {
      if (autoplayRef.current) {
        clearTimeout(autoplayRef.current)
        autoplayRef.current = null
      }
      return
    }

    const currentBanner = banners[currentIndex]
    // Используем индивидуальное время баннера или дефолтное (в миллисекундах)
    const bannerDuration = (currentBanner?.duration || interval / 1000) * 1000

    autoplayRef.current = setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % banners.length
        // Отслеживаем просмотр только если баннер виден минимум 2 секунды
        if (banners[next] && bannerDuration >= 2000) {
          trackView(banners[next].id)
        }
        return next
      })
    }, bannerDuration)

    return () => {
      if (autoplayRef.current) {
        clearTimeout(autoplayRef.current)
      }
    }
  }, [autoplay, banners.length, isPaused, currentIndex, banners, interval]) // Убрали trackView из зависимостей

  // Отслеживание кликов
  const trackClick = useCallback(async (bannerId: string) => {
    if (!bannerId) return
    
    try {
      const response = await fetch(`/api/banners/${bannerId}/click`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        // Не логируем ошибку, если это просто проблема с API
        return
      }
    } catch (error) {
      // Тихая ошибка - не ломаем работу компонента
    }
  }, [])

  // Обработка клика на баннер
  const handleBannerClick = (banner: AdBanner) => {
    trackClick(banner.id)

    if (banner.target_type === 'external_url' && banner.external_url) {
      window.open(banner.external_url, '_blank', 'noopener,noreferrer')
      return
    }

    if (banner.target_type === 'master' && banner.target_id) {
      router.push(`/profile/${banner.target_id}`)
      return
    }

    if (banner.target_type === 'product' && banner.target_id) {
      router.push(`/products/${banner.target_id}`)
      return
    }

    if (banner.target_type === 'category' && banner.target_id) {
      router.push(`/products?category=${banner.target_id}`)
      return
    }

    if (banner.target_type === 'order' && banner.target_id) {
      router.push(`/orders/${banner.target_id}`)
      return
    }
  }

  // Навигация
  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsPaused(true)
    // Отслеживаем просмотр только при ручной навигации, если баннер виден достаточно долго
    if (banners[index]) {
      setTimeout(() => {
        trackView(banners[index].id)
      }, 1000) // Отслеживаем через 1 секунду после показа
    }
    // Возобновляем автопрокрутку через 10 секунд
    setTimeout(() => setIsPaused(false), 10000)
  }

  const nextSlide = () => {
    const next = (currentIndex + 1) % banners.length
    goToSlide(next)
  }

  const prevSlide = () => {
    const prev = (currentIndex - 1 + banners.length) % banners.length
    goToSlide(prev)
  }

  // Touch handlers для свайпа
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
    setIsPaused(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const minSwipeDistance = 50

    if (distance > minSwipeDistance) {
      nextSlide()
    } else if (distance < -minSwipeDistance) {
      prevSlide()
    }

    setTouchStart(0)
    setTouchEnd(0)
    setTimeout(() => setIsPaused(false), 10000)
  }

  // Не показываем компонент во время загрузки или если нет баннеров
  if (loading || banners.length === 0) {
    return null
  }

  // Безопасный индекс
  const safeIndex = currentIndex >= 0 && currentIndex < banners.length ? currentIndex : 0
  const currentBanner = banners[safeIndex]

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-bg-secondary md:h-[280px] h-[180px] w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Контейнер для всех баннеров с горизонтальной прокруткой */}
        <div
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className="relative w-full h-full flex-shrink-0 cursor-pointer"
              onClick={() => handleBannerClick(banner)}
            >
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay для текста (если нужен) */}
              {(banner.type === 'image_text' || banner.type === 'image_button') && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-4 md:p-6">
                  <h3 className="text-white font-semibold text-lg md:text-xl mb-1">
                    {banner.title}
                  </h3>
                  {banner.description && (
                    <p className="text-white/90 text-sm md:text-base line-clamp-2">
                      {banner.description}
                    </p>
                  )}
                  {banner.type === 'image_button' && (
                    <button className="mt-3 px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium w-fit">
                      Подробнее
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Стрелки навигации (только для desktop) */}
        {banners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                prevSlide()
              }}
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow-lg transition-colors z-10"
              aria-label="Предыдущий баннер"
            >
              <FiChevronLeft size={20} className="text-text-primary" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                nextSlide()
              }}
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow-lg transition-colors z-10"
              aria-label="Следующий баннер"
            >
              <FiChevronRight size={20} className="text-text-primary" />
            </button>
          </>
        )}

        {/* Индикаторы (точки) */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  goToSlide(index)
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === safeIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Перейти к баннеру ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

