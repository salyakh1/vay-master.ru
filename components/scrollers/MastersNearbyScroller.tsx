'use client'

import { useEffect, useMemo, useState } from 'react'
import type { User } from '@/lib/supabase'
import HorizontalScroller, { ScrollerRadiusRow, ScrollerSectionHeader } from '@/components/scrollers/HorizontalScroller'
import MasterScrollerCard from '@/components/scrollers/MasterScrollerCard'

const DISPLAY_LIMIT = 15

type MastersNearbyScrollerProps = {
  lat: number
  lng: number
  radiusKm?: number
  city?: string | null
  limit?: number
}

export default function MastersNearbyScroller({
  lat,
  lng,
  radiusKm = 50,
  city,
  limit = DISPLAY_LIMIT,
}: MastersNearbyScrollerProps) {
  const [masters, setMasters] = useState<(User & { distance_km?: number })[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const url = useMemo(() => {
    const params = new URLSearchParams()
    params.set('lat', String(lat))
    params.set('lng', String(lng))
    params.set('radius_km', String(radiusKm))
    params.set('page', '1')
    return `/api/search/masters-nearby?${params.toString()}`
  }, [lat, lng, radiusKm])

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(url)
        const data = await res.json().catch(() => ({}))
        if (!active) return
        const list = (data?.masters as (User & { distance_km?: number })[]) || []
        setMasters(list.slice(0, limit))
        setTotal(data?.total ?? list.length)
      } catch {
        if (!active) return
        setMasters([])
        setTotal(0)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [url, limit])

  if (!loading && masters.length === 0) return null

  const shown = masters.slice(0, DISPLAY_LIMIT)
  const remaining = Math.max(0, total - shown.length)

  return (
    <section>
      <div className="h-2 bg-[#f2f2f7]" aria-hidden />
      <ScrollerSectionHeader
        tag="Работают с этим"
        tagVariant="green"
        title="Мастера по этим материалам"
        meta={loading ? 'Загрузка…' : `Показано ${shown.length}${total > shown.length ? ` из ${total}` : ''}`}
        linkHref="/search"
        linkLabel="Все →"
      />
      <ScrollerRadiusRow radiusKm={radiusKm} city={city} />
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
        <HorizontalScroller loadMoreHref="/search" loadMoreLabel="Ещё" loadMoreCount={remaining > 0 ? remaining : undefined}>
          {shown.map((master) => (
            <MasterScrollerCard key={master.id} master={master} />
          ))}
        </HorizontalScroller>
      )}
    </section>
  )
}
