'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { profileLoginUrl } from '@/lib/guest-access'
import type { AdBanner } from '@/lib/supabase'

type CompactPageBannerProps = {
  page: 'search' | 'products' | 'home'
  initialBanners?: AdBanner[] | null
  buttonLabel?: string
}

export default function CompactPageBanner({
  page,
  initialBanners = null,
  buttonLabel = 'Подробнее',
}: CompactPageBannerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [banners, setBanners] = useState<AdBanner[]>(initialBanners ?? [])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (initialBanners?.length) setBanners(initialBanners)
    let cancelled = false
    fetch(`/api/banners?page=${page}&limit=10`)
      .then((r) => (cancelled || !r.ok ? null : r.json()))
      .then((data) => {
        if (cancelled) return
        if (data?.banners?.length) {
          setBanners((prev) => (data.banners.length >= prev.length ? data.banners : prev))
        } else if (!initialBanners?.length) setBanners([])
      })
      .catch(() => {
        if (!initialBanners?.length) setBanners([])
      })
    return () => {
      cancelled = true
    }
  }, [page, initialBanners?.length])

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

  const dots =
    banners.length > 1 ? (
      <div className="flex gap-1 justify-center pt-1 pb-0.5">
        {banners.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-[5px] rounded-full transition-all ${
              i === index ? 'bg-brand-accent w-3.5 rounded-[3px]' : 'bg-[#ddd] w-[5px]'
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
        className="relative block w-full rounded-[14px] overflow-hidden text-left min-h-[88px] aspect-[2.8/1]"
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />
        <div
          className="absolute -right-2 -top-2 w-[60px] h-[60px] rounded-full bg-white/[0.07] pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 h-full flex items-center justify-between gap-2 px-3.5 py-3">
          <div className="min-w-0 flex-1">
            <span className="inline-block bg-white/20 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md mb-1 tracking-wide uppercase">
              {banner.badge_text || 'РЕКЛАМА'}
            </span>
            {banner.show_title !== false && banner.title && (
              <p className="text-white text-xs font-extrabold leading-tight mb-0.5 line-clamp-2">{banner.title}</p>
            )}
            {banner.show_description !== false && banner.description && (
              <p className="text-white/70 text-[9px] leading-snug line-clamp-2">{banner.description}</p>
            )}
          </div>
          <span className="bg-white text-brand-accent text-[9px] font-extrabold px-2.5 py-1.5 rounded-lg whitespace-nowrap flex-shrink-0">
            {buttonLabel}
          </span>
        </div>
      </button>
      {dots}
    </div>
  )
}
