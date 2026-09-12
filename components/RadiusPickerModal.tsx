'use client'

import { useEffect, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { MapContainer, TileLayer, Circle } from '@/components/maps/leaflet'
import ChangeMapView from '@/components/ChangeMapView'
import RadiusMapGestures from '@/components/maps/RadiusMapGestures'
import { configureLeafletIcons } from '@/lib/leaflet'
import { clampRadiusKm } from '@/lib/map-radius'
import 'leaflet/dist/leaflet.css'

export const RADIUS_PRESETS_KM = [5, 10, 25, 50, 100] as const

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423]

export type RadiusOrigin = { lat: number; lng: number }

interface RadiusPickerModalProps {
  isOpen: boolean
  currentRadiusKm: number
  lat?: number | null
  lng?: number | null
  city?: string | null
  resultsCount?: number
  resultsUnit?: string
  onSelect: (radiusKm: number, origin?: RadiusOrigin) => void
  onClose: () => void
}

export default function RadiusPickerModal({
  isOpen,
  currentRadiusKm,
  lat,
  lng,
  city,
  resultsCount,
  resultsUnit = 'мастеров',
  onSelect,
  onClose,
}: RadiusPickerModalProps) {
  const [draftKm, setDraftKm] = useState(currentRadiusKm)
  const [fitToken, setFitToken] = useState(0)
  const hasCoords = lat != null && lng != null
  const [marker, setMarker] = useState<[number, number]>(
    hasCoords ? [lat, lng] : DEFAULT_CENTER
  )

  useEffect(() => {
    if (!isOpen) return
    setDraftKm(currentRadiusKm)
    if (lat != null && lng != null) setMarker([lat, lng])
    setFitToken((n) => n + 1)
    // Сброс только при открытии: pinch не должен заново fitBounds.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentRadiusKm/lat/lng берутся с кадра открытия
  }, [isOpen])

  useEffect(() => {
    configureLeafletIcons()
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const applyPreset = (km: number) => {
    setDraftKm(km)
    setFitToken((n) => n + 1)
  }

  const radiusMeters = draftKm * 1000
  const ctaLabel =
    typeof resultsCount === 'number'
      ? `Показать ${resultsCount} ${resultsUnit}`
      : 'Применить'

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-lg bg-white rounded-t-2xl px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] animate-slide-up">
        <div className="w-9 h-1 bg-border-light rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[14px] font-medium text-graphite-primary">Радиус поиска</p>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="p-1 text-text-secondary">
            <FiX size={18} />
          </button>
        </div>

        <div className="relative h-[260px] rounded-[14px] overflow-hidden bg-[#EFEDE4] mb-2 touch-none">
          {typeof window !== 'undefined' ? (
            <MapContainer
              center={marker}
              zoom={11}
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
                attribution=""
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ChangeMapView center={marker} zoom={11} radiusKm={draftKm} fitToken={fitToken} />
              <RadiusMapGestures
                center={marker}
                onCenterChange={(nextLat, nextLng) => setMarker([nextLat, nextLng])}
                onRadiusChange={setDraftKm}
              />
              <Circle
                center={marker}
                radius={radiusMeters}
                pathOptions={{
                  color: '#C7362F',
                  fillColor: '#C7362F',
                  fillOpacity: 0.14,
                  weight: 1.5,
                }}
              />
            </MapContainer>
          ) : null}

          {city && (
            <span className="absolute left-2 bottom-2 z-[400] bg-white/85 text-[9px] text-text-secondary px-1.5 py-0.5 rounded-[5px] pointer-events-none">
              {city}
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#8e8e93] mb-3 leading-snug">
          Перетащите метку пальцем. Увеличьте или уменьшите радиус щипком (зум).
        </p>

        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[11px] text-text-muted">Показывать в пределах</span>
          <span className="text-[16px] font-medium text-graphite-primary">{draftKm} км</span>
        </div>

        <input
          type="range"
          min={1}
          max={200}
          step={1}
          value={draftKm}
          onChange={(e) => setDraftKm(clampRadiusKm(Number(e.target.value)))}
          className="w-full accent-brand-accent mb-3"
          aria-label="Радиус поиска в километрах"
        />

        <div className="flex gap-1.5 mb-3.5 flex-wrap">
          {RADIUS_PRESETS_KM.map((preset) => {
            const active = preset === draftKm
            return (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`flex-1 min-w-[52px] py-1.5 rounded-lg text-[11px] border transition-colors ${
                  active
                    ? 'bg-brand-accent/10 border-brand-accent text-brand-accent font-semibold'
                    : 'bg-[#F4F4F4] border-border-light text-[#374151]'
                }`}
              >
                {preset} км
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            onSelect(draftKm, { lat: marker[0], lng: marker[1] })
            onClose()
          }}
          className="w-full bg-brand-accent text-white text-[13px] font-medium py-2.5 rounded-[10px] active:scale-[0.98] transition-transform"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
