'use client'

import { useEffect, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { MapContainer, TileLayer, Marker, Circle } from '@/components/maps/leaflet'
import ChangeMapView from '@/components/ChangeMapView'
import { configureLeafletIcons } from '@/lib/leaflet'
import 'leaflet/dist/leaflet.css'

export const RADIUS_PRESETS_KM = [5, 10, 25, 50, 100] as const

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423]

interface RadiusPickerModalProps {
  isOpen: boolean
  currentRadiusKm: number
  lat?: number | null
  lng?: number | null
  city?: string | null
  resultsCount?: number
  resultsUnit?: string
  onSelect: (radiusKm: number) => void
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
  const hasCoords = lat != null && lng != null
  const center: [number, number] = hasCoords ? [lat, lng] : DEFAULT_CENTER

  useEffect(() => {
    if (isOpen) setDraftKm(currentRadiusKm)
  }, [isOpen, currentRadiusKm])

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

  const radiusMeters = draftKm * 1000
  const ctaLabel =
    typeof resultsCount === 'number'
      ? `Показать ${resultsCount} ${resultsUnit}`
      : 'Применить'

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />

      <div className="relative w-full max-w-lg bg-white rounded-t-2xl px-4 pt-3 pb-5 animate-slide-up">
        <div className="w-9 h-1 bg-border-light rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[14px] font-medium text-graphite-primary">Радиус поиска</p>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="p-1 text-text-secondary">
            <FiX size={18} />
          </button>
        </div>

        <div className="relative h-[190px] rounded-[14px] overflow-hidden bg-[#EFEDE4] mb-3.5">
          {typeof window !== 'undefined' && hasCoords ? (
            <MapContainer
              center={center}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              touchZoom={false}
            >
              <TileLayer
                attribution=""
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ChangeMapView center={center} zoom={11} radiusKm={draftKm} />
              <Marker position={center} />
              <Circle
                center={center}
                radius={radiusMeters}
                pathOptions={{
                  color: '#C7362F',
                  fillColor: '#C7362F',
                  fillOpacity: 0.14,
                  weight: 1.5,
                }}
              />
            </MapContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[11px] text-text-secondary text-center px-4">
                Разрешите геолокацию, чтобы увидеть зону поиска на карте
              </p>
            </div>
          )}

          {hasCoords && city && (
            <span className="absolute left-2 bottom-2 z-[400] bg-white/85 text-[9px] text-text-secondary px-1.5 py-0.5 rounded-[5px]">
              {city}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[11px] text-text-muted">Показывать в пределах</span>
          <span className="text-[16px] font-medium text-graphite-primary">{draftKm} км</span>
        </div>

        <input
          type="range"
          min={1}
          max={100}
          step={1}
          value={draftKm}
          onChange={(e) => setDraftKm(Number(e.target.value))}
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
                onClick={() => setDraftKm(preset)}
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
            onSelect(draftKm)
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
