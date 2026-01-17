'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { FiX, FiNavigation } from 'react-icons/fi'
import 'leaflet/dist/leaflet.css'

// dynamic() ломает типизацию пропсов компонентов react-leaflet — используем any
const MapContainer: any = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer: any = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker: any = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Circle: any = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false })

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423] // Москва
const DEFAULT_ZOOM = 10
const MIN_RADIUS = 1 // км
const MAX_RADIUS = 200 // км
const DEFAULT_RADIUS = 50 // км
const RADIUS_OPTIONS = [10, 15, 25, 50, 100] // кнопки выбора радиуса

type Value = {
  lat: number
  lng: number
  radiusKm: number
} | null

type Props = {
  value: Value
  onChange: (value: Value) => void
  city?: string // Город мастера для геокодирования при первом открытии
}

export default function MasterLocationPicker({ value, onChange, city }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(
    value ? [value.lat, value.lng] : null
  )
  const [radiusKm, setRadiusKm] = useState<number>(value?.radiusKm || DEFAULT_RADIUS)
  const [mapCenter, setMapCenter] = useState<[number, number]>(value ? [value.lat, value.lng] : DEFAULT_CENTER)
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [geocodingCity, setGeocodingCity] = useState(false)
  const markerRef = useRef<any>(null)
  const mapRef = useRef<any>(null)
  const fullscreenMapRef = useRef<any>(null)
  const leafletConfiguredRef = useRef(false)
  const cityGeocodedRef = useRef(false)

  useEffect(() => {
    // Настраиваем иконки Leaflet
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

  // Инициализация из value
  useEffect(() => {
    if (value && value.lat && value.lng) {
      setPosition([value.lat, value.lng])
      setRadiusKm(value.radiusKm || DEFAULT_RADIUS)
      setMapCenter([value.lat, value.lng])
    }
  }, [value?.lat, value?.lng, value?.radiusKm])

  // Обновляем центр карты при изменении position (для превью)
  useEffect(() => {
    if (position && mapRef.current && !isFullscreen) {
      mapRef.current.setView([position[0], position[1]], mapZoom)
    }
  }, [position, mapZoom, isFullscreen])

  // Обновляем центр карты в полноэкранном режиме
  useEffect(() => {
    if (position && fullscreenMapRef.current && isFullscreen) {
      fullscreenMapRef.current.setView([position[0], position[1]], mapZoom)
    }
  }, [position, mapZoom, isFullscreen])

  // Обновляем value при изменении position или radiusKm
  useEffect(() => {
    if (position) {
      onChange({
        lat: position[0],
        lng: position[1],
        radiusKm,
      })
    }
  }, [position, radiusKm, onChange])

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng
    setPosition([lat, lng])
    setMapCenter([lat, lng])
  }

  const handleMarkerDragEnd = (e: any) => {
    const marker = e.target
    const position = marker.getLatLng()
    setPosition([position.lat, position.lng])
    setMapCenter([position.lat, position.lng])
    setIsDragging(false)
  }

  const handleMarkerDragStart = () => {
    setIsDragging(true)
  }

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRadius = Number(e.target.value)
    setRadiusKm(newRadius)
  }

  const handleRadiusButtonClick = (radius: number) => {
    setRadiusKm(radius)
  }

  const handleOpenFullscreen = () => {
    setIsFullscreen(true)
  }

  const handleCloseFullscreen = () => {
    setIsFullscreen(false)
  }

  const handleRecenter = () => {
    if (position && fullscreenMapRef.current) {
      fullscreenMapRef.current.setView([position[0], position[1]], mapZoom)
    }
  }

  // Конвертируем радиус из км в метры для Leaflet Circle
  const radiusMeters = radiusKm * 1000

  // Компонент карты (используется и в превью, и в полноэкранном режиме)
  const MapContent = ({ isFullscreenMap = false }: { isFullscreenMap?: boolean }) => {
    const currentMapRef = isFullscreenMap ? fullscreenMapRef : mapRef
    
    // В полноэкранном режиме клик на карте устанавливает позицию, в превью - открывает полноэкранный режим
    const handleMapClickInContent = (e: any) => {
      if (isFullscreenMap) {
        handleMapClick(e)
      }
    }
    
    return (
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        onClick={handleMapClickInContent}
        className="z-0"
        whenCreated={(map: any) => {
          currentMapRef.current = map
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Маркер местоположения */}
        {position && (
          <>
            <Marker
              position={position}
              draggable={true}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
                dragstart: handleMarkerDragStart,
              }}
              ref={isFullscreenMap ? null : markerRef}
            />
            
            {/* Круг радиуса - всегда отображается, когда есть позиция */}
            <Circle
              center={position}
              radius={radiusMeters}
              pathOptions={{
                color: '#C7362F',
                fillColor: '#C7362F',
                fillOpacity: 0.3,
                weight: 3,
              }}
            />
          </>
        )}
      </MapContainer>
    )
  }

  return (
    <>
      <div className="master-location-picker w-full">
        <div className="mb-3">
          <label className="block text-sm font-medium mb-2">
            Зона обслуживания
          </label>
          <p className="text-xs text-text-secondary mb-3">
            Выберите ваше местоположение на карте и установите радиус обслуживания
          </p>
        </div>

        {/* Превью карты (кликабельное) */}
        <div 
          className="h-[300px] w-full rounded-lg overflow-hidden border border-border-light/60 mb-4 cursor-pointer relative"
          onClick={handleOpenFullscreen}
        >
          {typeof window !== 'undefined' && <MapContent />}
          <div className="absolute inset-0 bg-black/5 hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium shadow-lg pointer-events-auto">
              Нажмите, чтобы открыть карту
            </div>
          </div>
        </div>

        {/* Информация о выбранном радиусе */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Радиус обслуживания: <span className="text-brand-accent font-semibold">{radiusKm} км</span>
            </label>
            {position && (
              <span className="text-xs text-text-secondary">
                {position[0].toFixed(4)}, {position[1].toFixed(4)}
              </span>
            )}
          </div>

          {!position && (
            <p className="text-xs text-text-secondary mt-2">
              💡 Откройте карту и выберите ваше местоположение
            </p>
          )}
        </div>
      </div>

      {/* Полноэкранный режим карты */}
      {isFullscreen && typeof window !== 'undefined' && (
        <div className="fixed inset-0 z-[9999] bg-bg-primary flex flex-col">
          {/* Заголовок */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-border-light/70 bg-bg-card">
            <h2 className="text-lg font-semibold">Выбор зоны обслуживания</h2>
            <button
              onClick={handleCloseFullscreen}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Закрыть"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Карта на весь экран */}
          <div className="flex-1 relative">
            {geocodingCity ? (
              <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto mb-2"></div>
                  <p className="text-sm text-text-secondary">Определение местоположения...</p>
                </div>
              </div>
            ) : (
              <>
                <MapContent isFullscreenMap={true} />
                
                {/* Кнопка центрирования */}
                {position && (
                  <button
                    onClick={handleRecenter}
                    className="absolute bottom-24 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-[1000]"
                    aria-label="Центрировать карту"
                  >
                    <FiNavigation className="w-5 h-5 text-gray-700" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Панель выбора радиуса внизу */}
          <div className="h-20 bg-bg-card border-t border-border-light/70 px-4 py-3">
            <div className="flex items-center justify-center gap-2 h-full">
              {RADIUS_OPTIONS.map((radius) => (
                <button
                  key={radius}
                  onClick={() => handleRadiusButtonClick(radius)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    radiusKm === radius
                      ? 'bg-brand-accent text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {radius} км
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
