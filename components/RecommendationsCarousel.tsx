'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FiShoppingBag } from 'react-icons/fi'
import { Product } from '@/lib/supabase'

type RecommendationsCarouselProps = {
  title: string
  query?: string
  categoryId?: string
  subcategoryId?: string
  categorySlugs?: string[]
  subcategorySlugs?: string[]
  role?: string | null
  limit?: number
}

export default function RecommendationsCarousel({
  title,
  query,
  categoryId,
  subcategoryId,
  categorySlugs,
  subcategorySlugs,
  role,
  limit = 20,
}: RecommendationsCarouselProps) {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const url = useMemo(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (categoryId) params.set('categoryId', categoryId)
    if (subcategoryId) params.set('subcategoryId', subcategoryId)
    if (categorySlugs && categorySlugs.length > 0) {
      params.set('categorySlugs', categorySlugs.join(','))
    }
    if (subcategorySlugs && subcategorySlugs.length > 0) {
      params.set('subcategorySlugs', subcategorySlugs.join(','))
    }
    if (role) params.set('role', role)
    params.set('limit', String(limit))
    return `/api/recommendations/products?${params.toString()}`
  }, [query, categoryId, subcategoryId, categorySlugs, subcategorySlugs, role, limit])

  // Загружаем только когда карусель близко к viewport — не грузим всё сразу
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setShouldLoad(true)
      },
      { rootMargin: '400px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shouldLoad) return
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(url)
        const data = await res.json().catch(() => ({}))
        if (!active) return
        setItems((data?.items as Product[]) || [])
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
  }, [url, shouldLoad])

  if (!shouldLoad) return <div ref={containerRef} className="mb-6 min-h-[140px]" aria-hidden />
  if (!loading && items.length === 0) return <div ref={containerRef} className="mb-6" />

  return (
    <div ref={containerRef} className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-semibold text-graphite-secondary">
          {title}
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="min-w-[128px] max-w-[128px] bg-gradient-to-br from-white to-red-50 border-2 border-red-200/50 rounded-xl overflow-hidden shadow-md animate-pulse"
              >
                <div className="w-full aspect-square bg-gradient-to-br from-red-100 to-red-200" />
                <div className="p-2 space-y-1.5">
                  <div className="h-2.5 bg-red-200 rounded" />
                  <div className="h-3 bg-red-200 rounded w-2/3" />
                </div>
              </div>
            ))
          : items.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group min-w-[128px] max-w-[128px] bg-gradient-to-br from-white via-red-50/30 to-white border-2 border-red-300/40 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 snap-start hover:scale-105 hover:border-red-400/60"
              >
                {/* Градиентный акцент сверху */}
                <div className="relative h-0.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500" />
                
                <div className="w-full aspect-square bg-gradient-to-br from-red-50 to-red-100/50 relative overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <>
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        sizes="128px"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-red-400">
                      <FiShoppingBag size={24} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                
                <div className="p-2 bg-white/80 backdrop-blur-sm">
                  <div className="text-[11px] font-medium text-graphite-secondary line-clamp-2 leading-snug min-h-[28px] group-hover:text-red-600 transition-colors">
                    {product.name}
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <div className="text-[13px] font-bold text-red-600">
                      {product.price.toLocaleString('ru-RU')} ₽
                    </div>
                    {product.reviews_count && product.reviews_count > 0 && product.rating ? (
                      <div className="flex items-center gap-0.5 text-[9px] text-text-muted">
                        <span className="text-red-500">★</span>
                        <span>{product.rating.toFixed(1)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
      </div>
    </div>
  )
}
