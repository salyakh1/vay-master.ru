'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { Order } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

import 'leaflet/dist/leaflet.css'

// dynamic() ломает типизацию пропсов компонентов react-leaflet — используем any
const MapContainer: any = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer: any = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker: any = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Popup: any = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false })

type OrderPoint = {
  order: Order
  lat: number
  lon: number
  label: string
}

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423] // Москва
const DEFAULT_ZOOM = 4
const FOCUS_ZOOM = 14
const GEOCODE_LIMIT = 80

export default function OrdersMap({ orders, focusOrderId }: { orders: Order[]; focusOrderId?: string }) {
  const [points, setPoints] = useState<OrderPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const mapRef = useRef<any>(null)
  const fullscreenMapRef = useRef<any>(null)
  const markerRefs = useRef<Record<string, any>>({})
  const leafletConfiguredRef = useRef(false)
  const ordersWithCoords = useMemo(() => {
    return orders.filter((o) => typeof (o as any)?.lat === 'number' && typeof (o as any)?.lng === 'number')
  }, [orders])

  const ordersMissingCoords = useMemo(() => {
    return orders
      .filter((o) => (o as any)?.lat == null || (o as any)?.lng == null)
      .filter((o) => {
        const city = ((o as any)?.city as string | undefined) || ''
        const location = ((o as any)?.location as string | undefined) || ''
        return (city + ' ' + location).trim().length > 0
      })
      .slice(0, GEOCODE_LIMIT)
  }, [orders])

  useEffect(() => {
    // Настраиваем иконки Leaflet (иначе маркеры могут быть "битые" в сборке)
    if (leafletConfiguredRef.current) return
    leafletConfiguredRef.current = true

    void import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
        iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
        shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
      })
    })
  }, [])

  useEffect(() => {
    // 1) точки из БД (если координаты уже есть)
    const base = ordersWithCoords.map((order) => ({
      order,
      lat: Number((order as any).lat),
      lon: Number((order as any).lng),
      label: (order as any).geocode_label || (order as any).city || (order as any).location || 'Заказ',
    }))
    setPoints(base)
  }, [ordersWithCoords])

  useEffect(() => {
    // 2) временный fallback: геокодим отсутствующие координаты (с кэшем), чтобы карта не была пустой
    // и пробуем сохранить lat/lng в БД, если колонки уже добавлены.
    let cancelled = false

    const run = async () => {
      if (ordersMissingCoords.length === 0) return
      setLoading(true)

      const lsKey = 'orders_geocode_cache_v2'
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(lsKey) : null
      const cache: Record<string, { lat: number; lng: number; label?: string }> = raw ? JSON.parse(raw) : {}

      const mkQuery = (o: Order) => {
        const city = ((o as any)?.city as string | undefined) || ''
        const location = ((o as any)?.location as string | undefined) || ''
        return [city, location].filter(Boolean).join(', ').trim()
      }

      const geocodeViaApi = async (query: string) => {
        const res = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return null
        if (typeof data?.lat !== 'number' || typeof data?.lng !== 'number') return null
        return { lat: data.lat as number, lng: data.lng as number, label: typeof data?.label === 'string' ? data.label : undefined }
      }

      const geocodeDirect = async (query: string) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
        const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
        if (!res.ok) return null
        const json = (await res.json()) as any[]
        const first = json?.[0]
        const lat = Number(first?.lat)
        const lng = Number(first?.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
        const label = first?.display_name ? String(first.display_name) : undefined
        return { lat, lng, label }
      }

      const newPoints: OrderPoint[] = []

      for (const order of ordersMissingCoords) {
        if (cancelled) return
        const query = mkQuery(order)
        if (!query) continue

        const cacheKey = order.id
        const cached = cache[cacheKey]
        let geo = cached ? { lat: cached.lat, lng: cached.lng, label: cached.label } : null

        if (!geo) {
          geo = (await geocodeViaApi(query)) || (await geocodeDirect(query))
          if (geo) {
            cache[cacheKey] = { lat: geo.lat, lng: geo.lng, label: geo.label }
            // небольшая пауза — чтобы не спамить сервис
            await new Promise((r) => setTimeout(r, 150))
          }
        }

        if (!geo) continue

        newPoints.push({
          order,
          lat: geo.lat,
          lon: geo.lng,
          label: geo.label || (order as any).city || (order as any).location || 'Заказ',
        })

        // попытка записать координаты в orders (если миграция уже применена)
        try {
          await supabase
            .from('orders')
            .update({
              lat: geo.lat,
              lng: geo.lng,
              geocoded_at: new Date().toISOString(),
              geocode_label: geo.label || null,
              geocode_source: 'fallback',
            } as any)
            .eq('id', order.id)
        } catch {
          // ignore
        }
      }

      if (!cancelled) {
        setPoints((prev) => {
          const existing = new Set(prev.map((p) => p.order.id))
          const merged = [...prev]
          for (const p of newPoints) {
            if (!existing.has(p.order.id)) merged.push(p)
          }
          return merged
        })
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(lsKey, JSON.stringify(cache))
        }
      }
      if (!cancelled) setLoading(false)
    }

    void run().catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [ordersMissingCoords])

  useEffect(() => {
    if (!mapRef.current) return
    if (points.length === 0) return

    void import('leaflet').then((L) => {
      if (!mapRef.current) return
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]))
      mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 })
    })
  }, [points])

  useEffect(() => {
    if (!fullscreenMapRef.current) return
    if (points.length === 0) return

    void import('leaflet').then((L) => {
      if (!fullscreenMapRef.current) return
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]))
      fullscreenMapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 })
    })
  }, [points, isFullscreen])

  useEffect(() => {
    // Открытие карты во весь экран по клику/тапу на карту (в обычном режиме)
    if (isFullscreen) return
    const map = mapRef.current
    if (!map) return

    const handler = () => setIsFullscreen(true)
    try {
      map.on?.('click', handler)
      return () => map.off?.('click', handler)
    } catch {
      return
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!focusOrderId) return
    if (points.length === 0) return

    const activeMap = (isFullscreen ? fullscreenMapRef.current : mapRef.current) as any
    if (!activeMap) return

    const hasPoint = points.some((p) => p.order.id === focusOrderId)
    if (!hasPoint) return

    const tryOpen = () => {
      const marker = markerRefs.current[focusOrderId]
      if (!marker) return false
      try {
        const ll = marker.getLatLng?.()
        if (ll) {
          activeMap.setView?.(ll, FOCUS_ZOOM, { animate: true })
        }
        marker.openPopup?.()
        return true
      } catch {
        return false
      }
    }

    // дождёмся монтирования маркера
    if (tryOpen()) return
    const t = window.setTimeout(() => tryOpen(), 150)
    return () => window.clearTimeout(t)
  }, [focusOrderId, points, isFullscreen])

  const MapBody = ({ onCreated }: { onCreated: (map: any) => void }) => (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
      whenCreated={onCreated}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {points.map((p) => (
        <Marker
          key={p.order.id}
          position={[p.lat, p.lon]}
          ref={(m: any) => {
            if (m) markerRefs.current[p.order.id] = m
          }}
        >
          <Popup>
            <div className="space-y-2">
              {Array.isArray((p.order as any)?.images) && (p.order as any).images[0] ? (
                <img
                  src={(p.order as any).images[0]}
                  alt={(p.order as any)?.title ? `Фото: ${(p.order as any).title}` : 'Фото заказа'}
                  className="w-full rounded-md object-cover"
                  style={{ maxWidth: 260, maxHeight: 140 }}
                  loading="lazy"
                />
              ) : null}
              <div className="font-semibold">{(p.order as any)?.title || 'Заказ'}</div>
              <div className="text-sm">
                {(p.order as any)?.city ? <div>Город: {(p.order as any).city}</div> : null}
                {(p.order as any)?.category ? <div>Категория: {(p.order as any).category}</div> : null}
                {(p.order as any)?.budget ? (
                  <div>Бюджет: {Number((p.order as any).budget).toLocaleString('ru-RU')} ₽</div>
                ) : null}
              </div>
              <Link href={`/orders/${p.order.id}`} className="text-brand-accent font-semibold">
                Открыть заказ
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )

  return (
    <div className="orders-map bg-bg-card rounded-lg border border-border-light/60 overflow-hidden">
      <div className="h-[60vh] min-h-[420px] w-full">
        <MapBody
          onCreated={(map: any) => {
            mapRef.current = map
            // Убираем префикс Leaflet ("Leaflet" + иконка)
            try {
              map.attributionControl?.setPrefix(false)
            } catch {
              // ignore
            }
          }}
        />
      </div>

      <div className="px-4 py-3 text-sm text-text-secondary border-t border-border-light/60">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            {loading
              ? 'Загрузка точек для карты...'
              : points.length === 0
                ? 'Пока нет точек на карте. Создайте заказ с городом/адресом или добавьте координаты в базе.'
                : `Показано на карте: ${points.length}`}
          </div>
          <div className="text-xs text-text-muted">© OpenStreetMap contributors</div>
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-[999] bg-bg-primary">
          <div className="h-14 px-4 flex items-center justify-between border-b border-border-light/70 bg-bg-card">
            <div className="font-semibold text-graphite-secondary">Карта заказов</div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsFullscreen(false)}
            >
              Закрыть
            </button>
          </div>
          <div className="h-[calc(100dvh-3.5rem)] w-full">
            <MapBody
              onCreated={(map: any) => {
                fullscreenMapRef.current = map
                try {
                  map.attributionControl?.setPrefix(false)
                } catch {
                  // ignore
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

