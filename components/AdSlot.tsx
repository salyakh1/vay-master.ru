'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { AdBanner, AdContext, AdType } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { profileLoginUrl } from '@/lib/guest-access'
import { FiExternalLink, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface AdSlotProps {
  type: AdType
  context?: AdContext
  className?: string
  maxWidth?: string
  showBadge?: boolean
  position?: 'before' | 'after' | 'inline'
  index?: number // Для INLINE_CONTEXT: показывать каждые N элементов
}

export default function AdSlot({
  type,
  context,
  className = '',
  maxWidth,
  showBadge = true,
  position = 'inline',
  index = 0,
}: AdSlotProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [ad, setAd] = useState<AdBanner | null>(null)
  const [ads, setAds] = useState<AdBanner[]>([]) // Для INLINE_CONTEXT карусели
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const touchStartX = useRef<number>(0)
  const touchEndX = useRef<number>(0)
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchAd()
  }, [type, context?.page, context?.category, context?.city])

  const fetchAd = async () => {
    try {
      setLoading(true)
      setError(null)

      // Формируем параметры запроса
      const params = new URLSearchParams({
        type: type,
        ...(context?.page && { page: context.page }),
        ...(context?.category && { category: JSON.stringify(context.category) }),
        ...(context?.keywords && { keywords: JSON.stringify(context.keywords) }),
        ...(context?.city && { city: context.city }),
        ...(context?.masterId && { masterId: context.masterId }),
        ...(context?.specialization && { specialization: context.specialization }),
      })

      const response = await fetch(`/api/ads?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch ad')
      }

      const data = await response.json()
      
      // Для INLINE_CONTEXT может быть массив реклам
      if (type === 'INLINE_CONTEXT' && data.ads && Array.isArray(data.ads)) {
        if (data.ads.length > 0) {
          setAds(data.ads)
          setAd(data.ads[0]) // Первая реклама по умолчанию
          setCurrentAdIndex(0)
          // Отслеживаем показ первой рекламы
          trackImpression(data.ads[0].id)
        } else {
          setAds([])
          setAd(null)
        }
      } else if (data.ad) {
        setAd(data.ad)
        setAds([])
        // Отслеживаем показ
        trackImpression(data.ad.id)
      } else {
        setAd(null)
        setAds([])
      }
    } catch (err) {
      console.error('Error fetching ad:', err)
      setError('Failed to load ad')
      setAd(null)
    } finally {
      setLoading(false)
    }
  }

  const trackImpression = async (adId: string) => {
    try {
      await fetch(`/api/ads/${adId}/impression`, {
        method: 'POST',
      })
    } catch (err) {
      console.error('Error tracking impression:', err)
    }
  }

  const trackClick = async (adId: string) => {
    try {
      await fetch(`/api/ads/${adId}/click`, {
        method: 'POST',
      })
    } catch (err) {
      console.error('Error tracking click:', err)
    }
  }

  // Навигация по карусели
  const goToNext = () => {
    if (ads.length > 0) {
      const nextIndex = (currentAdIndex + 1) % ads.length
      setCurrentAdIndex(nextIndex)
      setAd(ads[nextIndex])
      trackImpression(ads[nextIndex].id)
      resetAutoplay()
    }
  }

  const goToPrevious = () => {
    if (ads.length > 0) {
      const prevIndex = (currentAdIndex - 1 + ads.length) % ads.length
      setCurrentAdIndex(prevIndex)
      setAd(ads[prevIndex])
      trackImpression(ads[prevIndex].id)
      resetAutoplay()
    }
  }

  const goToSlide = (index: number) => {
    if (ads.length > 0 && index >= 0 && index < ads.length) {
      setCurrentAdIndex(index)
      setAd(ads[index])
      trackImpression(ads[index].id)
      resetAutoplay()
    }
  }

  // Автопрокрутка
  const startAutoplay = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current)
    }
    autoplayRef.current = setInterval(() => {
      goToNext()
    }, 5000) // Меняем каждые 5 секунд
  }

  const resetAutoplay = () => {
    if (ads.length > 1) {
      startAutoplay()
    }
  }

  const stopAutoplay = () => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current)
      autoplayRef.current = null
    }
  }

  // Свайп на мобильных
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Свайп влево - следующая реклама
        goToNext()
      } else {
        // Свайп вправо - предыдущая реклама
        goToPrevious()
      }
    }
    
    touchStartX.current = 0
    touchEndX.current = 0
  }

  useEffect(() => {
    // Запускаем автопрокрутку если реклам несколько
    if (ads.length > 1) {
      startAutoplay()
    } else {
      stopAutoplay()
    }
    
    return () => {
      stopAutoplay()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ads.length])

  const handleClick = (e: React.MouseEvent) => {
    if (!ad) return

    e.preventDefault()
    trackClick(ad.id)

    // Обработка перехода
    if (ad.target_type === 'external_url' && ad.external_url) {
      window.open(ad.external_url, '_blank', 'noopener,noreferrer')
    } else if (ad.target_type === 'master' && ad.target_id) {
      router.push(user ? `/profile/${ad.target_id}` : profileLoginUrl(ad.target_id))
    } else if (ad.target_type === 'product' && ad.target_id) {
      router.push(`/products/${ad.target_id}`)
    } else if (ad.target_type === 'category' && ad.target_id) {
      router.push(`/products?category=${ad.target_id}`)
    } else if (ad.affiliate_url) {
      window.open(ad.affiliate_url, '_blank', 'noopener,noreferrer')
    }
  }

  // Для INLINE_CONTEXT: проверка выполняется в родительском компоненте через index
  // Здесь не фильтруем, так как родитель уже решил показывать или нет

  if (loading) {
    return null // Не показываем ничего во время загрузки
  }

  if (error || !ad) {
    return null // Не показываем ошибку, просто не рендерим
  }

  // Проверяем лимиты
  if (
    (ad.impression_limit && ad.current_impressions && ad.current_impressions >= ad.impression_limit) ||
    (ad.click_limit && ad.current_clicks && ad.current_clicks >= ad.click_limit)
  ) {
    return null
  }

  // Рендерим в зависимости от типа
  const renderAd = () => {
    switch (type) {
      case 'HERO_SPONSORED':
        return renderHeroAd()
      case 'INLINE_CONTEXT':
        return renderInlineAd()
      case 'SPONSORED_CARD':
        return renderCardAd()
      case 'PROFILE_RELATED':
        return renderProfileAd()
      case 'FOOTER_BRAND':
        return renderFooterAd()
      default:
        return null
    }
  }

  const renderHeroAd = () => (
    <div
      className={`relative rounded-lg overflow-hidden ${maxWidth || 'w-full'} ${className}`}
      onClick={handleClick}
    >
      <img
        src={ad.image_url}
        alt={ad.title}
        className="w-full h-auto object-cover cursor-pointer"
      />
      {ad.show_badge && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {ad.badge_text || 'Реклама'}
        </div>
      )}
      {ad.description && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <h3 className="text-white font-semibold text-lg mb-1">{ad.title}</h3>
          <p className="text-white/90 text-sm">{ad.description}</p>
        </div>
      )}
    </div>
  )

  const renderInlineAd = () => {
    // Если реклам несколько - показываем карусель
    if (ads.length > 1) {
      return (
        <div
          className={`card relative border-2 border-brand-accent/30 overflow-hidden ${className}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseEnter={stopAutoplay}
          onMouseLeave={() => resetAutoplay()}
        >
          {ad.show_badge && (
            <div className="absolute top-2 right-2 bg-brand-accent text-white text-xs px-2 py-1 rounded z-20">
              {ad.badge_text || 'Реклама'}
            </div>
          )}
          
          {/* Контент рекламы */}
          <div className="flex gap-4" onClick={handleClick}>
            <Image
              src={ad.image_url}
              alt={ad.title}
              width={96}
              height={96}
              className="w-24 h-24 object-cover rounded-lg cursor-pointer"
              unoptimized={!String(ad.image_url).includes('supabase')}
            />
            <div className="flex-1">
              <h3 className="font-semibold text-graphite-secondary mb-1 cursor-pointer">
                {ad.title}
              </h3>
              {ad.description && (
                <p className="text-sm text-text-secondary mb-2 line-clamp-2">{ad.description}</p>
              )}
              {ad.brand_name && (
                <p className="text-xs text-text-secondary">от {ad.brand_name}</p>
              )}
            </div>
          </div>

          {/* Стрелки навигации */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              goToPrevious()
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors z-20"
            aria-label="Предыдущая реклама"
          >
            <FiChevronLeft size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goToNext()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors z-20"
            aria-label="Следующая реклама"
          >
            <FiChevronRight size={18} />
          </button>

          {/* Индикаторы (точки) */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  goToSlide(index)
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentAdIndex
                    ? 'bg-brand-accent w-6'
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                aria-label={`Перейти к рекламе ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )
    }

    // Если реклама одна - показываем как обычно
    return (
      <div
        className={`card relative border-2 border-brand-accent/30 ${className}`}
        onClick={handleClick}
      >
        {ad.show_badge && (
          <div className="absolute top-2 right-2 bg-brand-accent text-white text-xs px-2 py-1 rounded z-10">
            {ad.badge_text || 'Реклама'}
          </div>
        )}
        <div className="flex gap-4">
          <Image
            src={ad.image_url}
            alt={ad.title}
            width={96}
            height={96}
            className="w-24 h-24 object-cover rounded-lg cursor-pointer"
            unoptimized={!String(ad.image_url).includes('supabase')}
          />
          <div className="flex-1">
            <h3 className="font-semibold text-graphite-secondary mb-1 cursor-pointer">
              {ad.title}
            </h3>
            {ad.description && (
              <p className="text-sm text-text-secondary mb-2 line-clamp-2">{ad.description}</p>
            )}
            {ad.brand_name && (
              <p className="text-xs text-text-secondary">от {ad.brand_name}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderCardAd = () => (
    <div
      className={`card relative border-2 border-brand-accent/30 hover:border-brand-accent/50 transition-colors ${className}`}
      onClick={handleClick}
    >
      {ad.show_badge && (
        <div className="absolute top-2 right-2 bg-brand-accent text-white text-xs px-2 py-1 rounded z-10">
          {ad.badge_text || 'Реклама'}
        </div>
      )}
      <div className="relative w-full h-48">
        <Image
          src={ad.image_url}
          alt={ad.title}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover rounded-t-lg cursor-pointer"
          unoptimized={!String(ad.image_url).includes('supabase')}
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-graphite-secondary mb-2 cursor-pointer">
          {ad.title}
        </h3>
        {ad.description && (
          <p className="text-sm text-text-secondary mb-2 line-clamp-2">{ad.description}</p>
        )}
        {ad.brand_name && (
          <p className="text-xs text-text-secondary">от {ad.brand_name}</p>
        )}
      </div>
    </div>
  )

  const renderProfileAd = () => (
    <div
      className={`card relative border border-border-color ${className}`}
      onClick={handleClick}
    >
      {ad.show_badge && (
        <div className="absolute top-2 right-2 bg-text-secondary/80 text-white text-xs px-2 py-1 rounded z-10">
          {ad.badge_text || 'Партнёр'}
        </div>
      )}
      <div className="flex gap-4">
        <Image
          src={ad.image_url}
          alt={ad.title}
          width={80}
          height={80}
          className="w-20 h-20 object-cover rounded-lg cursor-pointer"
          unoptimized={!String(ad.image_url).includes('supabase')}
        />
        <div className="flex-1">
          <h3 className="font-semibold text-graphite-secondary mb-1 cursor-pointer">
            {ad.title}
          </h3>
          {ad.description && (
            <p className="text-sm text-text-secondary line-clamp-2">{ad.description}</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderFooterAd = () => (
    <div
      className={`flex items-center justify-center p-2 ${className}`}
      onClick={handleClick}
    >
      <Image
        src={ad.image_url}
        alt={ad.brand_name || ad.title}
        width={120}
        height={32}
        className="h-8 w-auto object-contain opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        title={ad.title}
        unoptimized={!String(ad.image_url).includes('supabase')}
      />
    </div>
  )

  return (
    <div className={`ad-slot ad-slot-${type.toLowerCase()}`}>
      {renderAd()}
    </div>
  )
}
