'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FiShoppingBag, FiMapPin } from 'react-icons/fi'
import { Product } from '@/lib/supabase'

type NearbyProductsCarouselProps = {
  masterLat: number
  masterLng: number
  radiusKm: number
  limit?: number
  onShowMap?: () => void
}

export default function NearbyProductsCarousel({
  masterLat,
  masterLng,
  radiusKm,
  limit = 12,
  onShowMap,
}: NearbyProductsCarouselProps) {
  const [items, setItems] = useState<(Product & { distance_km?: number })[]>([])
  const [loading, setLoading] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm sm:text-base font-semibold text-graphite-secondary flex items-center gap-1.5">
          <FiMapPin className="text-brand-accent shrink-0" size={14} />
          <span className="truncate">Товары рядом ({radiusKm} км)</span>
        </h2>
        {onShowMap && (
          <button
            onClick={onShowMap}
            className="text-xs text-brand-accent hover:underline flex items-center gap-1 shrink-0"
          >
            <FiMapPin size={12} />
            На карте
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
          {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="min-w-[112px] max-w-[112px] bg-gradient-to-br from-white to-green-50 border border-green-200/50 rounded-lg overflow-hidden shadow-sm animate-pulse"
              >
                <div className="w-full aspect-square bg-gradient-to-br from-green-100 to-green-200" />
                <div className="p-1.5 space-y-1">
                  <div className="h-2 bg-green-200 rounded" />
                  <div className="h-2.5 bg-green-200 rounded w-2/3" />
                </div>
              </div>
            ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border-light/60 bg-bg-secondary/50 px-3 py-2 text-center text-text-secondary text-xs">
          В радиусе {radiusKm} км пока нет товаров
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
          {items.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group min-w-[112px] max-w-[112px] bg-gradient-to-br from-white via-green-50/30 to-white border border-green-300/40 rounded-lg overflow-hidden shadow-sm hover:shadow transition-all duration-300 snap-start hover:scale-[1.02] hover:border-green-400/50"
              >
                <div className="relative h-0.5 bg-gradient-to-r from-green-500 via-green-400 to-green-500" />
                
                <div className="w-full aspect-square bg-gradient-to-br from-green-50 to-green-100/50 relative overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <>
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        sizes="112px"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-green-400">
                      <FiShoppingBag size={20} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                
                <div className="p-1.5 bg-white/80 backdrop-blur-sm">
                  <div className="text-[10px] font-medium text-graphite-secondary line-clamp-2 leading-snug min-h-[24px] group-hover:text-green-600 transition-colors">
                    {product.name}
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <div className="text-[12px] font-bold text-green-600">
                      {product.price.toLocaleString('ru-RU')} ₽
                    </div>
                    {product.reviews_count && product.reviews_count > 0 && product.rating ? (
                      <div className="flex items-center gap-0.5 text-[8px] text-text-muted">
                        <span className="text-green-500">★</span>
                        <span>{product.rating.toFixed(1)}</span>
                      </div>
                    ) : null}
                  </div>
                  {product.distance_km !== undefined && (
                    <div className="mt-0.5 text-[8px] text-text-secondary flex items-center gap-0.5">
                      <FiMapPin size={8} />
                      {product.distance_km} км
                    </div>
                  )}
                </div>
              </Link>
            ))}
        </div>
      )}
    </div>
  )
}
