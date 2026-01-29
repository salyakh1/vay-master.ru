'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FiX } from 'react-icons/fi'
import { configureLeafletIcons } from '@/lib/leaflet'
import 'leaflet/dist/leaflet.css'

const MapContainer: any = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer: any = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker: any = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Popup: any = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false })
const ChangeMapView = dynamic(() => import('@/components/ChangeMapView'), { ssr: false })

const ZOOM = 16

type Props = {
  isOpen: boolean
  onClose: () => void
  lat: number
  lng: number
  address: string
  title?: string
}

export default function StoreLocationMapModal({ isOpen, onClose, lat, lng, address, title = 'Адрес на карте' }: Props) {
  useEffect(() => {
    configureLeafletIcons()
  }, [])

  if (!isOpen) return null

  const center: [number, number] = [lat, lng]

  return (
    <div className="fixed inset-0 z-[9999] bg-bg-primary flex flex-col">
      <div className="h-14 px-4 flex items-center justify-between border-b border-border-light/70 bg-bg-card shrink-0">
        <h2 className="text-lg font-semibold truncate pr-2">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          aria-label="Закрыть"
        >
          <FiX className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 min-h-0 relative">
        {typeof window !== 'undefined' && (
          <MapContainer
            center={center}
            zoom={ZOOM}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <ChangeMapView center={center} zoom={ZOOM} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={center}>
              <Popup>
                <span className="text-sm font-medium">{address}</span>
              </Popup>
            </Marker>
          </MapContainer>
        )}
      </div>
    </div>
  )
}
