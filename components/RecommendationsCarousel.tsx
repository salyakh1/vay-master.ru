'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import type { Product } from '@/lib/supabase'
import HorizontalScroller, { ScrollerSectionHeader } from '@/components/scrollers/HorizontalScroller'
import ProductScrollerCard from '@/components/scrollers/ProductScrollerCard'

const DISPLAY_LIMIT = 15

type RecommendationsCarouselProps = {
  title: string
  tag?: string
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
  tag = 'Рекомендуем',
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
    if (categorySlugs && categorySlugs.length > 0) params.set('categorySlugs', categorySlugs.join(','))
    if (subcategorySlugs && subcategorySlugs.length > 0) params.set('subcategorySlugs', subcategorySlugs.join(','))
    if (role) params.set('role', role)
    params.set('limit', String(limit))
    return `/api/recommendations/products?${params.toString()}`
  }, [query, categoryId, subcategoryId, categorySlugs, subcategorySlugs, role, limit])

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

  if (!shouldLoad) return <div ref={containerRef} className="mb-4 min-h-[140px]" aria-hidden />
  if (!loading && items.length === 0) return <div ref={containerRef} className="mb-4" />

  const shown = items.slice(0, DISPLAY_LIMIT)
  const remaining = Math.max(0, items.length - shown.length)

  return (
    <section ref={containerRef} className="mb-4">
      <ScrollerSectionHeader
        tag={tag}
        tagVariant="blue"
        title={title}
        meta={loading ? 'Загрузка…' : `Показано ${shown.length}${items.length > shown.length ? ` из ${items.length}` : ''}`}
        linkHref="/products"
        linkLabel="Все →"
      />
      {loading ? (
        <HorizontalScroller>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[126px] h-[140px] rounded-[14px] bg-white border border-[#e5e5ea] animate-pulse" />
          ))}
        </HorizontalScroller>
      ) : (
        <HorizontalScroller loadMoreHref="/products" loadMoreLabel="Ещё" loadMoreCount={remaining > 0 ? remaining : undefined}>
          {shown.map((product) => (
            <ProductScrollerCard key={product.id} product={product} />
          ))}
        </HorizontalScroller>
      )}
    </section>
  )
}
