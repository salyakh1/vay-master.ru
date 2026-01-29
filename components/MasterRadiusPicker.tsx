'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { configureLeafletIcons } from '@/lib/leaflet'
import { useAuth } from '@/app/providers'
import { FiCheck, FiMapPin, FiEdit2 } from 'react-icons/fi'
import 'leaflet/dist/leaflet.css'

const MapContainer: any = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer: any = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker: any = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Circle: any = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false })
const ChangeMapView = dynamic(() => import('@/components/ChangeMapView'), { ssr: false })

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423] // Москва
const DEFAULT_ZOOM = 11

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] // км

export default function MasterRadiusPicker() {
  const { user } = useAuth()
  const [radius, setRadius] = useState<number>(50)
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [address, setAddress] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const mapRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (user?.service_radius_km) {
      setRadius(user.service_radius_km)
    }
    if (user?.master_lat != null && user?.master_lng != null) {
      const pos: [number, number] = [user.master_lat, user.master_lng]
      setPosition(pos)
      setMapCenter(pos)
    }
  }, [user])

  // Всегда подгонять вид карты под текущую точку (маркер в Москве — карта тоже в Москве)
  useEffect(() => {
    if (!position || !mapRef.current) return
    mapRef.current.setView(position, 14)
  }, [position, mapReady])

  useEffect(() => {
    configureLeafletIcons()
  }, [])

  const handleGeocode = async () => {
    if (!address.trim()) {
      alert('Введите адрес точки выезда')
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
        alert('Адрес не найден. Укажите более точный адрес.')
        setGeocoding(false)
        return
      }
      const pos: [number, number] = [data.lat, data.lng]
      setPosition(pos)
      setMapCenter(pos)
      // Вид карты обновится в useEffect по [position]
    } catch (error) {
      console.error('Geocoding error:', error)
      alert('Ошибка при поиске адреса')
    } finally {
      setGeocoding(false)
    }
  }

  const handleSave = async () => {
    if (!user || user.role !== 'master') return

    setLoading(true)
    setSaved(false)

    try {
      const payload: { service_radius_km: number; master_lat?: number; master_lng?: number } = {
        service_radius_km: radius,
      }
      if (position) {
        payload.master_lat = position[0]
        payload.master_lng = position[1]
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)

      if (error) throw error

      setSaved(true)
      setIsCollapsed(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving radius:', error)
      alert('Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'master') {
    return null
  }

  const radiusMeters = radius * 1000
  const hasSavedData = position !== null

  if (isCollapsed && hasSavedData) {
    return (
      <div className="card p-4">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <FiMapPin className="text-brand-accent" />
          Радиус выполнения услуг
        </h3>
        <p className="text-sm text-text-secondary mb-3">
          Радиус {radius} км от точки выезда настроен
        </p>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="btn btn-secondary w-full flex items-center justify-center gap-2"
        >
          <FiEdit2 size={16} />
          Изменить
        </button>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <FiMapPin className="text-brand-accent" />
        Радиус выполнения услуг
      </h3>
      <p className="text-sm text-text-secondary mb-4">
        Выберите максимальное расстояние, на которое вы готовы выезжать для выполнения услуг
      </p>

      {/* Точка выезда + карта */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Точка выезда</label>
          <p className="text-xs text-text-secondary mb-2">
            Укажите адрес, от которого считается радиус (мастерская, дом, офис)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Например: Москва, ул. Ленина, д. 10"
              className="input flex-1"
              disabled={geocoding || loading}
            />
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding || !address.trim() || loading}
              className="btn btn-secondary whitespace-nowrap"
            >
              {geocoding ? 'Поиск...' : 'На карте'}
            </button>
          </div>
        </div>

        <div className="relative rounded-lg overflow-hidden border border-border-light/60 bg-bg-secondary" style={{ height: 320 }}>
          {typeof window !== 'undefined' && (
            <MapContainer
              center={mapCenter}
              zoom={position ? 11 : DEFAULT_ZOOM}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
              whenCreated={(map: any) => {
                mapRef.current = map
                setMapReady(true)
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ChangeMapView center={position ?? mapCenter} zoom={14} radiusKm={position ? radius : undefined} />
              {position && (
                <>
                  <Marker position={position} />
                  <Circle
                    center={position}
                    radius={radiusMeters}
                    pathOptions={{
                      color: 'var(--brand-accent, #e11d48)',
                      fillColor: 'var(--brand-accent, #e11d48)',
                      fillOpacity: 0.15,
                      weight: 2,
                    }}
                  />
                </>
              )}
            </MapContainer>
          )}
          {!position && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/90 pointer-events-none z-10">
              <p className="text-sm text-text-secondary text-center px-4">
                Укажите адрес выезда и нажмите «На карте», чтобы показать зону обслуживания
              </p>
            </div>
          )}
        </div>
        {position && (
          <p className="text-xs text-text-secondary">
            Зона {radius} км от точки выезда отмечена на карте
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {RADIUS_OPTIONS.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => setRadius(option)}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              radius === option
                ? 'bg-brand-accent text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {option} км
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={loading || saved}
        className={`btn w-full ${
          saved ? 'btn-success' : 'btn-primary'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          'Сохранение...'
        ) : saved ? (
          <>
            <FiCheck className="mr-2" />
            Сохранено
          </>
        ) : (
          'Сохранить радиус'
        )}
      </button>
    </div>
  )
}
