'use client'

import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'

type Props = {
  center: [number, number]
  zoom: number
  radiusKm?: number
  /** Меняйте, когда нужно подогнать карту под круг (кнопки км). Не меняйте при pinch. */
  fitToken?: number
}

export default function ChangeMapView({ center, zoom, radiusKm, fitToken = 0 }: Props) {
  const map = useMap()
  const centerRef = useRef(center)
  const radiusRef = useRef(radiusKm)
  const zoomRef = useRef(zoom)
  centerRef.current = center
  radiusRef.current = radiusKm
  zoomRef.current = zoom

  useEffect(() => {
    const [lat, lng] = centerRef.current
    const r = radiusRef.current
    if (r != null && r > 0) {
      const kmPerDegLat = 111
      const kmPerDegLng = 111 * Math.cos((lat * Math.PI) / 180)
      const dLat = r / kmPerDegLat
      const dLng = r / Math.max(0.2, kmPerDegLng)
      map.fitBounds(
        [
          [lat - dLat, lng - dLng],
          [lat + dLat, lng + dLng],
        ],
        { padding: [28, 28], maxZoom: 15, animate: true }
      )
    } else {
      map.setView([lat, lng], zoomRef.current)
    }
  }, [fitToken, map])

  return null
}
