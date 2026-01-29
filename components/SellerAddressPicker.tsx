'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { FiX, FiNavigation, FiMapPin, FiCheck, FiEdit2 } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/providers'
import StoreLocationMapModal from '@/components/StoreLocationMapModal'
import { configureLeafletIcons } from '@/lib/leaflet'
import 'leaflet/dist/leaflet.css'

// dynamic() ломает типизацию пропсов компонентов react-leaflet — используем any
const MapContainer: any = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer: any = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker: any = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423] // Москва
const DEFAULT_ZOOM = 12

type Props = {
  onSave?: () => void
}

export default function SellerAddressPicker({ onSave }: Props) {
  const { user } = useAuth()
  const [address, setAddress] = useState('')
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const mapRef = useRef<any>(null)
  const fullscreenMapRef = useRef<any>(null)
  const leafletConfiguredRef = useRef(false)

  const hasConfigured = !!(user?.store_address && user?.seller_lat != null && user?.seller_lng != null)

  useEffect(() => {
    if (!user || user.role !== 'seller') return

    // Загружаем текущий адрес и координаты
    if (user.store_address) {
      setAddress(user.store_address)
    }
    if (user.seller_lat && user.seller_lng) {
      const pos: [number, number] = [user.seller_lat, user.seller_lng]
      setPosition(pos)
      setMapCenter(pos)
    }
  }, [user])

  useEffect(() => {
    configureLeafletIcons()
  }, [])

  const handleGeocode = async () => {
    if (!address.trim()) {
      alert('Введите адрес')
      return
    }

    setGeocoding(true)

    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: address }),
      })

      const data = await res.json()

      if (!res.ok || !data.lat || !data.lng) {
        alert('Адрес не найден. Попробуйте указать более точный адрес или выберите точку на карте.')
        setGeocoding(false)
        return
      }

      const pos: [number, number] = [data.lat, data.lng]
      setPosition(pos)
      setMapCenter(pos)
      
      if (mapRef.current) {
        mapRef.current.setView(pos, 15)
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      alert('Ошибка при поиске адреса')
    } finally {
      setGeocoding(false)
    }
  }

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng
    const pos: [number, number] = [lat, lng]
    setPosition(pos)
    setMapCenter(pos)
  }

  const handleMarkerDragEnd = (e: any) => {
    const marker = e.target
    const position = marker.getLatLng()
    const pos: [number, number] = [position.lat, position.lng]
    setPosition(pos)
    setMapCenter(pos)
  }

  const handleSave = async () => {
    if (!user || user.role !== 'seller') return
    if (!address.trim()) {
      alert('Введите адрес магазина')
      return
    }
    if (!position) {
      alert('Укажите местоположение на карте')
      return
    }

    setSaving(true)
    setSaved(false)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          store_address: address.trim(),
          seller_lat: position[0],
          seller_lng: position[1],
        })
        .eq('id', user.id)

      if (error) throw error

      setSaved(true)
      setShowForm(false)
      setTimeout(() => setSaved(false), 3000)
      
      if (onSave) {
        onSave()
      }
    } catch (error) {
      console.error('Error saving address:', error)
      alert('Ошибка при сохранении адреса')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenFullscreen = () => {
    setIsFullscreen(true)
  }

  const handleCloseFullscreen = () => {
    setIsFullscreen(false)
  }

  const handleRecenter = () => {
    if (position && fullscreenMapRef.current) {
      fullscreenMapRef.current.setView(position, mapZoom)
    }
  }

  const MapContent = ({ isFullscreenMap = false }: { isFullscreenMap?: boolean }) => {
    const currentMapRef = isFullscreenMap ? fullscreenMapRef : mapRef

    return (
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        onClick={handleMapClick}
        className="z-0"
        whenCreated={(map: any) => {
          currentMapRef.current = map
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {position && (
          <Marker
            position={position}
            draggable={true}
            eventHandlers={{
              dragend: handleMarkerDragEnd,
            }}
          />
        )}
      </MapContainer>
    )
  }

  if (!user || user.role !== 'seller') {
    return null
  }

  // Компактный вид: адрес уже настроен — показываем текст и кнопку «Изменить»
  if (hasConfigured && !showForm) {
    return (
      <>
        <div className="card p-4">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            <FiMapPin className="text-brand-accent" />
            Адрес магазина/склада
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              {user.seller_lat != null && user.seller_lng != null ? (
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className="text-sm font-medium text-text-primary truncate text-left w-full underline decoration-brand-accent/60 underline-offset-2 hover:decoration-brand-accent hover:text-brand-accent transition-colors"
                  title="Показать на карте"
                >
                  {user.store_address}
                </button>
              ) : (
                <p className="text-sm font-medium text-text-primary truncate" title={user.store_address ?? ''}>
                  {user.store_address}
                </p>
              )}
              <p className="text-xs text-text-secondary mt-0.5">
                Адрес настроен
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="btn btn-secondary shrink-0 inline-flex items-center justify-center gap-2"
            >
              <FiEdit2 className="w-4 h-4" />
              Изменить
            </button>
          </div>
        </div>
        {showMapModal && user.seller_lat != null && user.seller_lng != null && (
          <StoreLocationMapModal
            isOpen={true}
            onClose={() => setShowMapModal(false)}
            lat={user.seller_lat}
            lng={user.seller_lng}
            address={user.store_address || user.city || 'Адрес магазина'}
            title="Адрес магазина"
          />
        )}
      </>
    )
  }

  return (
    <div className="card p-4">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <FiMapPin className="text-brand-accent" />
        Адрес магазина/склада
      </h3>
      <p className="text-sm text-text-secondary mb-4">
        Сначала введите адрес в поле ниже и нажмите «Найти на карте» — метка появится на карте сама. Если метка не там, перетащите её или кликните по карте в нужное место.
      </p>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">1. Адрес в письменном виде</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Например: Москва, ул. Ленина, д. 10"
              className="input flex-1"
              disabled={geocoding || saving}
            />
            <button
              onClick={handleGeocode}
              disabled={geocoding || !address.trim() || saving}
              className="btn btn-secondary whitespace-nowrap"
            >
              {geocoding ? 'Поиск...' : 'Найти на карте'}
            </button>
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-gray-500 mb-1">2. Карта (метка ставится по адресу; при необходимости подкорректируйте)</span>
          <div className="h-[300px] w-full rounded-lg overflow-hidden border border-border-light/60 relative">
            {typeof window !== 'undefined' && <MapContent />}
            {!position ? (
              <div
                className="absolute inset-0 bg-black/5 flex items-center justify-center cursor-pointer"
                onClick={handleOpenFullscreen}
              >
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium shadow-lg text-center">
                  Сначала введите адрес выше и нажмите «Найти на карте»
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-medium shadow text-center">
                    Перетащите маркер или кликните на карте для уточнения
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenFullscreen}
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-white/90 text-xs font-medium shadow hover:bg-white pointer-events-auto"
                >
                  Развернуть карту
                </button>
              </div>
            )}
          </div>
        </div>

        {position && (
          <div className="text-xs text-text-secondary">
            Координаты: {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || saved || !address.trim() || !position}
        className={`btn w-full ${
          saved ? 'btn-success' : 'btn-primary'
        } ${saving || !address.trim() || !position ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {saving ? (
          'Сохранение...'
        ) : saved ? (
          <>
            <FiCheck className="mr-2" />
            Сохранено
          </>
        ) : (
          'Сохранить адрес'
        )}
      </button>

      {/* Полноэкранный режим карты */}
      {isFullscreen && typeof window !== 'undefined' && (
        <div className="fixed inset-0 z-[9999] bg-bg-primary flex flex-col">
          <div className="h-14 px-4 flex items-center justify-between border-b border-border-light/70 bg-bg-card">
            <h2 className="text-lg font-semibold">Выбор местоположения магазина</h2>
            <button
              onClick={handleCloseFullscreen}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Закрыть"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 relative">
            <MapContent isFullscreenMap={true} />
            
            {position && (
              <button
                onClick={handleRecenter}
                className="absolute bottom-24 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-[1000]"
                aria-label="Центрировать карту"
              >
                <FiNavigation className="w-5 h-5 text-gray-700" />
              </button>
            )}
          </div>

          <div className="h-20 bg-bg-card border-t border-border-light/70 px-4 py-3">
            <p className="text-sm text-text-secondary text-center">
              Кликните на карте или перетащите маркер, чтобы указать местоположение магазина
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
