'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle } from '@/components/maps/leaflet'
import ChangeMapView from '@/components/ChangeMapView'
import RadiusMapGestures from '@/components/maps/RadiusMapGestures'
import { configureLeafletIcons } from '@/lib/leaflet'
import 'leaflet/dist/leaflet.css'

type LocationMapProps = {
  center: [number, number]
  radiusKm: number | null
  fitToken: number
  onCenterChange: (lat: number, lng: number) => void
  onRadiusChange: (km: number) => void
}

export default function LocationMap({ center, radiusKm, fitToken, onCenterChange, onRadiusChange }: LocationMapProps) {
  useEffect(() => {
    configureLeafletIcons()
  }, [])

  return (
    <MapContainer
      center={center}
      zoom={radiusKm ? 11 : 14}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
      zoomControl={false}
      dragging
      scrollWheelZoom
      doubleClickZoom={false}
      touchZoom
      bounceAtZoomLimits={false}
      zoomSnap={0.25}
      zoomDelta={0.5}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ChangeMapView center={center} zoom={15} radiusKm={radiusKm ?? undefined} fitToken={fitToken} />
      <RadiusMapGestures
        center={center}
        onCenterChange={onCenterChange}
        onRadiusChange={radiusKm ? onRadiusChange : () => {}}
      />
      {radiusKm != null && (
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#C7362F', fillColor: '#C7362F', fillOpacity: 0.12, weight: 2 }}
        />
      )}
    </MapContainer>
  )
}
