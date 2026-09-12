'use client'

import { useEffect, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Marker } from '@/components/maps/leaflet'
import { clampRadiusKm } from '@/lib/map-radius'

export function radiusKmFromViewport(map: L.Map, lat: number, lng: number): number {
  const size = map.getSize()
  const pad = 36
  const px = Math.max(20, Math.min(size.x, size.y) / 2 - pad)
  const origin = L.latLng(lat, lng)
  const originPt = map.latLngToContainerPoint(origin)
  const edge = map.containerPointToLatLng(L.point(originPt.x + px, originPt.y))
  return clampRadiusKm(origin.distanceTo(edge) / 1000)
}

function getPinIcon() {
  return L.divIcon({
    className: 'vay-radius-pin',
    html: `<div style="width:48px;height:48px;display:flex;align-items:flex-end;justify-content:center;touch-action:none">
      <div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#C7362F;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 44],
  })
}

type RadiusMapGesturesProps = {
  center: [number, number]
  onCenterChange: (lat: number, lng: number) => void
  onRadiusChange: (km: number) => void
}

/** Метка перетаскивается пальцем; щипок (zoom) меняет радиус круга. */
export default function RadiusMapGestures({
  center,
  onCenterChange,
  onRadiusChange,
}: RadiusMapGesturesProps) {
  const map = useMap()
  const centerRef = useRef(center)
  centerRef.current = center
  const draggingPin = useRef(false)
  const iconRef = useRef<L.DivIcon | null>(null)
  if (!iconRef.current) iconRef.current = getPinIcon()

  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 80)
    return () => window.clearTimeout(t)
  }, [map])

  const applyViewportRadius = (originalEvent?: Event) => {
    if (draggingPin.current) return
    if (!originalEvent) return
    const [lat, lng] = centerRef.current
    onRadiusChange(radiusKmFromViewport(map, lat, lng))
  }

  useMapEvents({
    zoom(e) {
      applyViewportRadius(e.originalEvent)
    },
    zoomend(e) {
      applyViewportRadius(e.originalEvent)
    },
    click(e) {
      if (draggingPin.current) return
      onCenterChange(e.latlng.lat, e.latlng.lng)
      map.panTo(e.latlng)
    },
  })

  return (
    <Marker
      position={center}
      draggable
      autoPan
      icon={iconRef.current}
      zIndexOffset={800}
      eventHandlers={{
        add: (e: { target: { dragging?: { enable: () => void } } }) => {
          e.target.dragging?.enable()
        },
        click: (e: { originalEvent?: { stopPropagation?: () => void } }) => {
          e.originalEvent?.stopPropagation?.()
        },
        dragstart: () => {
          draggingPin.current = true
          map.dragging.disable()
        },
        dragend: (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
          const ll = e.target.getLatLng()
          onCenterChange(ll.lat, ll.lng)
          map.panTo(ll)
          map.dragging.enable()
          draggingPin.current = false
        },
      }}
    />
  )
}
