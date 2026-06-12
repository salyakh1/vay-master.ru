'use client'

import { useCallback, useMemo } from 'react'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useScrollerData } from '@/hooks/useScrollerData'
import { fetchMastersPage, SCROLLER_PAGE_SIZE } from '@/lib/scrollerApi'
import HorizontalScroller, { ScrollerRadiusRow, ScrollerSectionHeader } from '@/components/scrollers/HorizontalScroller'
import MasterScrollerCard from '@/components/scrollers/MasterScrollerCard'

type MastersScrollerSectionProps = {
  title: string
  label: string
  labelVariant?: 'blue' | 'green' | 'red'
  href?: string
  linkLabel?: string
  q?: string
  city?: string
  category?: string
  subcategory?: string
  service?: string
  lat?: number | null
  lng?: number | null
  radiusKm?: number
  showRadius?: boolean
}

export function MastersScrollerSection({
  title,
  label,
  labelVariant = 'blue',
  href,
  linkLabel,
  q,
  city,
  category,
  subcategory,
  service,
  lat: latProp,
  lng: lngProp,
  radiusKm: radiusProp,
  showRadius = true,
}: MastersScrollerSectionProps) {
  const location = useUserLocation()
  const lat = latProp ?? location.lat
  const lng = lngProp ?? location.lng
  const radiusKm = radiusProp ?? location.radiusKm
  const cityLabel = city ?? location.city

  const deps = useMemo(
    () => [q, city, category, subcategory, service, lat, lng, radiusKm],
    [q, city, category, subcategory, service, lat, lng, radiusKm]
  )

  const fetcher = useCallback(
    (page: number) =>
      fetchMastersPage({
        page,
        limit: SCROLLER_PAGE_SIZE,
        q,
        city,
        category,
        subcategory,
        service,
        lat,
        lng,
        radiusKm,
      }),
    [q, city, category, subcategory, service, lat, lng, radiusKm]
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
        linkLabel={href ? (linkLabel ?? 'Все →') : undefined}
      />
      {showRadius && lat != null && lng != null && (
        <ScrollerRadiusRow radiusKm={radiusKm} city={cityLabel} />
      )}
      {loading ? (
        <HorizontalScroller>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[144px] h-[120px] rounded-2xl bg-white border border-[#e5e5ea] animate-pulse"
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
          {items.map((master) => (
            <MasterScrollerCard key={master.id} master={master} />
          ))}
        </HorizontalScroller>
      )}
    </section>
  )
}
