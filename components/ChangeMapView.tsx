'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

type Props = {
  center: [number, number]
  zoom: number
  /** Когда задан — карта подгоняется так, чтобы был виден весь круг радиуса (50 км, 100 км и т.д.) */
  radiusKm?: number
}

/** Подгоняет вид карты: при radiusKm — fitBounds по кругу, иначе setView(center, zoom) */
export default function ChangeMapView({ center, zoom, radiusKm }: Props) {
  const map = useMap()
  useEffect(() => {
    if (radiusKm != null && radiusKm > 0) {
      // Границы круга: ~111 км на 1° широты, по долготе зависит от широты
      const lat = center[0]
      const lng = center[1]
      const kmPerDegLat = 111
      const kmPerDegLng = 111 * Math.cos((lat * Math.PI) / 180)
      const dLat = radiusKm / kmPerDegLat
      const dLng = radiusKm / kmPerDegLng
      const bounds: [[number, number], [number, number]] = [
        [lat - dLat, lng - dLng],
        [lat + dLat, lng + dLng],
      ]
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
    } else {
      map.setView(center, zoom)
    }
  }, [center, zoom, radiusKm, map])
  return null
}
