'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AdBanner } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import { profileLoginUrl } from '@/lib/guest-access'

interface AdBannerSliderProps {
  page: 'home' | 'search' | 'orders' | 'products' | 'feed'
  autoplay?: boolean
  interval?: number
  className?: string
  /** Данные с сервера для быстрого LCP (SSR) */
  initialBanners?: AdBanner[] | null
}

const MOBILE_HEIGHT = 190
const BORDER_RADIUS = 36
const PADDING = 16
const MIN_SWIPE_DISTANCE = 50

/** Лейбл в левом верхнем углу (если нет badge_text — дефолт по типу) */
function getTopLabel(banner: AdBanner): string {
  if (banner.badge_text) return banner.badge_text
  switch (banner.type) {
    case 'category_promo': return 'Рекомендуем'
    case 'product_promo': return 'Товар'
    case 'master_promo': return 'Мастер'
    default: return 'Акция'
  }
}

/** Короткий оффер для badge в контенте (подзаголовок или обрезка description) */
function getBadgeOffer(banner: AdBanner): string | null {
  if (banner.show_badge && banner.badge_text) return banner.badge_text
  if (banner.description) return banner.description.length > 40 ? banner.description.slice(0, 37) + '…' : banner.description
  return null
}

export default function AdBannerSlider({
  page,
  autoplay = true,
  interval = 5000,
  className = '',
  initialBanners = null,
}: AdBannerSliderProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [banners, setBanners] = useState<AdBanner[]>(initialBanners ?? [])
  const [loading, setLoading] = useState(!(initialBanners && initialBanners.length > 0))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const trackedViewsRef = useRef<Set<string>>(new Set())
  const trackViewTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const trackViewRef = useRef<((bannerId: string) => void) | null>(null)

  useEffect(() => {
    trackViewRef.current = async (bannerId: string) => {
      if (!bannerId || trackedViewsRef.current.has(bannerId)) return
      trackedViewsRef.current.add(bannerId)
      if (trackViewTimeoutRef.current) clearTimeout(trackViewTimeoutRef.current)
      trackViewTimeoutRef.current = setTimeout(async () => {
        try {
          const ctrl = new AbortController()
          const t = setTimeout(() => ctrl.abort(), 5000)
          await fetch(`/api/banners/${bannerId}/view`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal })
          clearTimeout(t)
        } catch (e: any) {
          if (e?.name === 'AbortError') return
          trackedViewsRef.current.delete(bannerId)
        }
      }, 2000)
    }
    return () => { if (trackViewTimeoutRef.current) clearTimeout(trackViewTimeoutRef.current) }
  }, [])

  const trackView = useCallback((bannerId: string) => { trackViewRef.current?.(bannerId) }, [])

  useEffect(() => {
    trackedViewsRef.current.clear()
    let cancelled = false
    setBanners(initialBanners ?? [])
    setLoading(!(initialBanners && initialBanners.length > 0))
    if (initialBanners?.[0]?.id) trackViewRef.current?.(initialBanners[0].id)

    fetch(`/api/banners?page=${page}&limit=10`, { cache: 'no-store' })
      .then((r) => (cancelled || !r.ok ? null : r.json()))
      .then((data) => {
        if (cancelled) return
        const next = Array.isArray(data?.banners) ? data.banners : []
        setBanners(next)
        if (next[0]?.id) trackViewRef.current?.(next[0].id)
      })
      .catch(() => {
        if (!cancelled) setBanners([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, initialBanners])

  useEffect(() => {
    if (!autoplay || banners.length <= 1 || isPaused) {
      if (autoplayRef.current) { clearTimeout(autoplayRef.current); autoplayRef.current = null }
      return
    }
    const cur = banners[currentIndex]
    // duration в баннере — в секундах; interval — в мс; минимум 3 сек для автопрокрутки
    const durationMs = Math.max(3000, (cur?.duration ?? interval / 1000) * 1000)
    autoplayRef.current = setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % banners.length
        if (banners[next] && durationMs >= 2000) trackView(banners[next].id)
        return next
      })
    }, durationMs)
    return () => { if (autoplayRef.current) clearTimeout(autoplayRef.current) }
  }, [autoplay, banners.length, isPaused, currentIndex, interval])

  const trackClick = useCallback(async (bannerId: string) => {
    try {
      await fetch(`/api/banners/${bannerId}/click`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    } catch (_) {}
  }, [])

  const handleBannerClick = (banner: AdBanner) => {
    trackClick(banner.id)
    if (banner.target_type === 'external_url' && banner.external_url) {
      window.open(banner.external_url, '_blank', 'noopener,noreferrer')
      return
    }
    if (banner.target_type === 'master' && banner.target_id) {
      router.push(user ? `/profile/${banner.target_id}` : profileLoginUrl(banner.target_id))
      return
    }
    if (banner.target_type === 'product' && banner.target_id) { router.push(`/products/${banner.target_id}`); return }
    if (banner.target_type === 'category' && banner.target_id) { router.push(`/products?category=${banner.target_id}`); return }
    if (banner.target_type === 'order' && banner.target_id) { router.push(`/orders/${banner.target_id}`); return }
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
    setIsPaused(true)
    if (banners[index]) setTimeout(() => trackView(banners[index].id), 1000)
    setTimeout(() => setIsPaused(false), 10000)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
    setIsPaused(true)
  }
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.targetTouches[0].clientX }
  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current
    if (distance > MIN_SWIPE_DISTANCE) goToSlide((currentIndex + 1) % banners.length)
    else if (distance < -MIN_SWIPE_DISTANCE) goToSlide((currentIndex - 1 + banners.length) % banners.length)
    setTimeout(() => setIsPaused(false), 10000)
  }

  const safeIndex = currentIndex >= 0 && currentIndex < banners.length ? currentIndex : 0
  const currentBanner = banners[safeIndex]
  const hasContent = !loading && banners.length > 0

  return (
    <div className={`relative w-full px-2 pt-4 isolate ${className}`}>
      {/* HeroWrapper: overflow hidden + position relative, фиксированная высота */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden max-w-full mx-auto bg-bg-secondary rounded-[36px] box-border isolate"
        style={{
          width: '96%',
          height: MOBILE_HEIGHT,
          minHeight: MOBILE_HEIGHT,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {hasContent ? (
          <>
            {/* SlidesContainer: flex, ширина по сумме слайдов, transition, translateX в % от контейнера */}
            <div
              className="flex h-full transition-transform duration-[400ms] ease-out"
              style={{
                transform: `translateX(-${safeIndex * (100 / banners.length)}%)`,
                width: `${banners.length * 100}%`,
              }}
            >
              {banners.map((banner, index) => {
                // Режим full_image: картинка на весь блок (в БД должна быть колонка hero_layout)
                const isFullImage = String(banner.hero_layout || '').toLowerCase() === 'full_image'
                return (
                <button
                  key={banner.id}
                  type="button"
                  className="flex flex-shrink-0 flex-row w-full h-full text-left cursor-pointer border-0 m-0 overflow-hidden box-border rounded-[22px] min-w-0"
                  style={{
                    width: `${100 / banners.length}%`,
                    minWidth: 0,
                    padding: isFullImage ? 0 : 16,
                    borderRadius: 22,
                  }}
                  onClick={() => handleBannerClick(banner)}
                >
                  {isFullImage ? (
                    /* Режим full_image: картинка на весь блок, скруглённые края */
                    <div className="relative w-full h-full min-h-full overflow-hidden rounded-[18px] bg-bg-secondary">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding={index === 0 ? 'sync' : 'async'}
                        fetchPriority={index === 0 ? 'high' : 'low'}
                      />
                      {(banner.show_title !== false && (banner.title || getTopLabel(banner))) && (
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent rounded-b-[18px]">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
                            {getTopLabel(banner)}
                          </span>
                          {banner.title && (
                            <h2 className="font-bold text-white leading-tight line-clamp-2 text-sm sm:text-base">
                              {banner.title}
                            </h2>
                          )}
                          {banner.show_description !== false && banner.description && (
                            <p className="text-white/80 text-xs line-clamp-2 mt-0.5">{banner.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Режим split: текст слева, картинка справа с лёгким скруглением */}
                      <div
                        className="flex flex-col justify-center relative z-[2] min-w-0 overflow-hidden"
                        style={{
                          width: '65%',
                          gap: '8px',
                          paddingRight: 12,
                        }}
                      >
                        {banner.show_title !== false && (
                          <>
                            <span
                              className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
                              style={{ marginBottom: 2 }}
                            >
                              {getTopLabel(banner)}
                            </span>
                            {banner.title && (
                              <h1
                                className="font-bold text-graphite-secondary leading-tight line-clamp-2"
                                style={{ fontSize: 'clamp(20px, 5vw, 24px)' }}
                              >
                                {banner.title}
                              </h1>
                            )}
                          </>
                        )}
                        {getBadgeOffer(banner) && getBadgeOffer(banner) !== getTopLabel(banner) && (
                          <span
                            className="inline-block px-3 py-1.5 rounded-2xl text-xs font-medium bg-brand-accent text-white w-fit"
                            style={{ padding: '6px 12px' }}
                          >
                            {getBadgeOffer(banner)}
                          </span>
                        )}
                        {banner.show_description !== false && banner.description && ((banner.show_badge && banner.badge_text) || !getBadgeOffer(banner)) && (
                          <p className="text-text-secondary line-clamp-2 text-sm break-words" style={{ fontSize: 14 }}>
                            {banner.description}
                          </p>
                        )}
                      </div>

                      <div
                        className="relative flex-shrink-0 z-[1] overflow-hidden rounded-xl"
                        style={{ width: '35%', height: '100%', minWidth: 0 }}
                      >
                        <div
                          className="absolute inset-0 overflow-hidden rounded-xl"
                          style={{ right: -16, top: -16, bottom: -16, width: 'calc(100% + 16px)' }}
                        >
                          <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading={index === 0 ? 'eager' : 'lazy'}
                            decoding={index === 0 ? 'sync' : 'async'}
                            fetchPriority={index === 0 ? 'high' : 'low'}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </button>
                )
              })}
            </div>

            {/* Pagination dots — absolute bottom-center */}
            {banners.length > 1 && (
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-[10]"
                style={{ bottom: PADDING }}
              >
                {banners.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goToSlide(index) }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === safeIndex
                        ? 'bg-brand-accent w-5'
                        : 'bg-border-color w-2 hover:bg-text-muted'
                    }`}
                    aria-label={`Слайд ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center bg-bg-secondary rounded-[36px]"
            style={{ minHeight: MOBILE_HEIGHT - PADDING * 2 }}
            aria-hidden
          >
            <div className="w-10 h-10 border-2 border-border-light border-t-brand-accent/50 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
