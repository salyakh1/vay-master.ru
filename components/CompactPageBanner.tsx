'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { profileLoginUrl } from '@/lib/guest-access'
import type { AdBanner } from '@/lib/supabase'

/** Единый размер всех общих баннеров (home / search / products / feed) */
export const UNIFIED_BANNER = {
  aspect: '2.8 / 1',
  /** Рекомендуемый файл для заказчиков */
  designWidth: 1400,
  designHeight: 500,
  minHeightPx: 88,
  radiusPx: 14,
} as const

type CompactPageBannerProps = {
  page: 'search' | 'products' | 'home' | 'feed' | 'orders'
  initialBanners?: AdBanner[] | null
  /** Текст кнопки, если в баннере не задан brand_name */
  buttonLabel?: string
}

export default function CompactPageBanner({
  page,
  initialBanners = null,
  buttonLabel = 'Смотреть',
}: CompactPageBannerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [banners, setBanners] = useState<AdBanner[]>(initialBanners ?? [])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    setBanners(initialBanners ?? [])
    fetch(`/api/banners?page=${page}&limit=10`, { cache: 'no-store' })
      .then((r) => (cancelled || !r.ok ? null : r.json()))
      .then((data) => {
        if (cancelled) return
        setBanners(Array.isArray(data?.banners) ? data.banners : [])
      })
      .catch(() => {
        if (!cancelled) setBanners([])
      })
    return () => {
      cancelled = true
    }
  }, [page, initialBanners])

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000)
    return () => clearInterval(t)
  }, [banners.length])

  const handleClick = (banner: AdBanner) => {
    fetch(`/api/banners/${banner.id}/click`, { method: 'POST' }).catch(() => {})
    if (banner.target_type === 'external_url' && banner.external_url) {
      window.open(banner.external_url, '_blank', 'noopener,noreferrer')
      return
    }
    if (banner.target_type === 'master' && banner.target_id) {
      router.push(user ? `/profile/${banner.target_id}` : profileLoginUrl(banner.target_id))
      return
    }
    if (banner.target_type === 'product' && banner.target_id) router.push(`/products/${banner.target_id}`)
    else if (banner.target_type === 'category' && banner.target_id) router.push(`/products?category=${banner.target_id}`)
    else if (banner.target_type === 'order' && banner.target_id) router.push(`/orders/${banner.target_id}`)
  }

  if (banners.length === 0) return null

  const banner = banners[index]
  const hasImage = !!banner.image_url
  const cta = (banner.brand_name || '').trim() || buttonLabel

  const dots =
    banners.length > 1 ? (
      <div className="flex gap-1.5 justify-center pt-1.5 pb-0.5">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'bg-brand-accent w-1.5' : 'bg-[#d0d0d0] w-1.5'
            }`}
            aria-label={`Баннер ${i + 1}`}
          />
        ))}
      </div>
    ) : null

  return (
    <div className="px-3.5 pt-2.5 pb-0.5">
      <button
        type="button"
        onClick={() => handleClick(banner)}
        className="relative block w-full overflow-hidden text-left shadow-sm min-h-[88px] aspect-[2.8/1] rounded-[14px]"
      >
        {hasImage ? (
          <img
            src={banner.image_url}
            alt={banner.title || 'Реклама'}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(110deg, #1a1a2e 0%, #C7362F 100%)' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-between px-3.5 py-2.5">
          <div className="min-w-0 max-w-[68%]">
            {banner.show_badge !== false && (
              <span className="inline-block bg-black/35 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md mb-1 tracking-wide uppercase backdrop-blur-[2px]">
                {banner.badge_text || 'АКЦИЯ'}
              </span>
            )}
            {banner.show_title !== false && banner.title && (
              <p className="text-white text-xs font-extrabold leading-tight mb-0.5 line-clamp-2 drop-shadow-sm">
                {banner.title}
              </p>
            )}
            {banner.show_description !== false && banner.description && (
              <p className="text-white/80 text-[9px] leading-snug line-clamp-2">{banner.description}</p>
            )}
          </div>
          <span className="self-start bg-white text-[#1c1c1e] text-[9px] font-extrabold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-sm">
            {cta}
          </span>
        </div>
      </button>
      {dots}
    </div>
  )
}
