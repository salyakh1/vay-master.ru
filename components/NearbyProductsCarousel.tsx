'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Product } from '@/lib/supabase'
import HorizontalScroller, { ScrollerRadiusRow, ScrollerSectionHeader } from '@/components/scrollers/HorizontalScroller'
import ProductScrollerCard from '@/components/scrollers/ProductScrollerCard'

const DISPLAY_LIMIT = 15

type NearbyProductsCarouselProps = {
  masterLat: number
  masterLng: number
  radiusKm: number
  city?: string | null
  limit?: number
  totalHint?: number
}

export default function NearbyProductsCarousel({
  masterLat,
  masterLng,
  radiusKm,
  city,
  limit = DISPLAY_LIMIT,
}: NearbyProductsCarouselProps) {
  const [items, setItems] = useState<(Product & { distance_km?: number })[]>([])
  const [loading, setLoading] = useState(false)

  const url = useMemo(() => {
    const params = new URLSearchParams()
    params.set('masterLat', String(masterLat))
    params.set('masterLng', String(masterLng))
    params.set('radiusKm', String(radiusKm))
    params.set('limit', String(limit))
    return `/api/recommendations/nearby?${params.toString()}`
  }, [masterLat, masterLng, radiusKm, limit])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(url)
        const data = await res.json().catch(() => ({}))
        if (!active) return
        setItems((data?.items as (Product & { distance_km?: number })[]) || [])
      } catch {
        if (!active) return
        setItems([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [url])

  if (!loading && items.length === 0) return null

  const shown = items.slice(0, DISPLAY_LIMIT)
  const remaining = Math.max(0, items.length - shown.length)

  return (
    <section className="mb-1">
      <ScrollerSectionHeader
        tag="Рекомендуем"
        tagVariant="blue"
        title="Топ товары рядом"
        meta={loading ? 'Загрузка…' : `Показано ${shown.length}${items.length > shown.length ? ` из ${items.length}` : ''}`}
      />
      <ScrollerRadiusRow radiusKm={radiusKm} city={city} />
      {loading ? (
        <HorizontalScroller>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[126px] h-[140px] rounded-[14px] bg-white border border-[#e5e5ea] animate-pulse"
            />
          ))}
        </HorizontalScroller>
      ) : (
        <HorizontalScroller
          loadMoreHref="/products"
          loadMoreLabel="Ещё"
          loadMoreCount={remaining > 0 ? remaining : undefined}
        >
          {shown.map((product) => (
            <ProductScrollerCard key={product.id} product={product} />
          ))}
        </HorizontalScroller>
      )}
    </section>
  )
}
