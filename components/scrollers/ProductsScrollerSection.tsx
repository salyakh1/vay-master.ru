'use client'

import { useCallback, useMemo } from 'react'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useScrollerData } from '@/hooks/useScrollerData'
import { fetchProductsScrollerPage, SCROLLER_PAGE_SIZE } from '@/lib/scrollerApi'
import HorizontalScroller, { ScrollerRadiusRow, ScrollerSectionHeader } from '@/components/scrollers/HorizontalScroller'
import ProductScrollerCard from '@/components/scrollers/ProductScrollerCard'

type ProductsScrollerSectionProps = {
  title: string
  label: string
  labelVariant?: 'blue' | 'green' | 'red'
  href?: string
  linkLabel?: string
  q?: string
  categorySlugs?: string[]
  subcategorySlugs?: string[]
  lat?: number | null
  lng?: number | null
  radiusKm?: number
  showRadius?: boolean
}

export function ProductsScrollerSection({
  title,
  label,
  labelVariant = 'blue',
  href,
  linkLabel,
  q,
  categorySlugs,
  subcategorySlugs,
  lat: latProp,
  lng: lngProp,
  radiusKm: radiusProp,
  showRadius = true,
}: ProductsScrollerSectionProps) {
  const location = useUserLocation()
  const lat = latProp ?? location.lat
  const lng = lngProp ?? location.lng
  const radiusKm = radiusProp ?? location.radiusKm
  const cityLabel = location.city

  const deps = useMemo(
    () => [q, categorySlugs?.join(','), subcategorySlugs?.join(','), lat, lng, radiusKm],
    [q, categorySlugs, subcategorySlugs, lat, lng, radiusKm]
  )

  const fetcher = useCallback(
    (page: number) =>
      fetchProductsScrollerPage({
        page,
        q,
        lat,
        lng,
        radiusKm,
        categorySlugs,
        subcategorySlugs,
      }),
    [q, lat, lng, radiusKm, categorySlugs, subcategorySlugs]
  )

  const { items, total, loading, loadMore, remaining, hasMore } = useScrollerData(
    fetcher,
    deps,
    SCROLLER_PAGE_SIZE
  )

  if (!loading && items.length === 0) return null

  return (
    <section className="bg-white">
      <ScrollerSectionHeader
        tag={label}
        tagVariant={labelVariant}
        title={title}
        meta={loading ? 'Загрузка…' : total > 0 ? `Показано ${items.length} из ${total}` : undefined}
        linkHref={href}
        linkLabel={href ? (linkLabel ?? 'Каталог →') : undefined}
      />
      {showRadius && lat != null && lng != null && (
        <ScrollerRadiusRow radiusKm={radiusKm} city={cityLabel} />
      )}
      {loading ? (
        <HorizontalScroller>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[126px] h-[110px] rounded-2xl bg-white border border-[#e5e5ea] animate-pulse"
            />
          ))}
        </HorizontalScroller>
      ) : (
        <HorizontalScroller
          loadMoreHref={href}
          onLoadMore={!href && hasMore ? loadMore : undefined}
          loadMoreLabel="Ещё"
          loadMoreCount={remaining > 0 ? remaining : undefined}
        >
          {items.map((product) => (
            <ProductScrollerCard key={product.id} product={product} />
          ))}
        </HorizontalScroller>
      )}
    </section>
  )
}
