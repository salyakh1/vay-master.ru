'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle } from '@/components/maps/leaflet'
import { supabase } from '@/lib/supabase'
import { configureLeafletIcons } from '@/lib/leaflet'
import { useAuth } from '@/app/providers'
import { FiCheck, FiMapPin, FiEdit2 } from 'react-icons/fi'
import ChangeMapView from '@/components/ChangeMapView'
import RadiusMapGestures from '@/components/maps/RadiusMapGestures'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER: [number, number] = [55.751244, 37.618423] // Москва
const DEFAULT_ZOOM = 11

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] // км

export default function MasterRadiusPicker() {
  const { user, refreshUser } = useAuth()
  const [radius, setRadius] = useState<number>(50)
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [address, setAddress] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [fitToken, setFitToken] = useState(0)

  useEffect(() => {
    if (user?.service_radius_km) {
      setRadius(user.service_radius_km)
    }
    if (user?.master_lat != null && user?.master_lng != null) {
      const pos: [number, number] = [user.master_lat, user.master_lng]
      setPosition(pos)
      setMapCenter(pos)
      setFitToken((n) => n + 1)
    }
  }, [user?.service_radius_km, user?.master_lat, user?.master_lng])

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
      setFitToken((n) => n + 1)
    } catch (error) {
      console.error('Geocoding error:', error)
      alert('Ошибка при поиске адреса')
    } finally {
      setGeocoding(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    setLoading(true)
    setSaved(false)

    try {
      const origin = position ?? mapCenter
      const payload: { service_radius_km: number; master_lat: number; master_lng: number } = {
        service_radius_km: radius,
        master_lat: origin[0],
        master_lng: origin[1],
      }
      try {
        localStorage.setItem('vay_nearby_view', JSON.stringify({ lat: origin[0], lng: origin[1] }))
      } catch {
        /* ignore */
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)

      if (error) throw error

      try {
        localStorage.setItem('vay_search_radius_km', String(radius))
      } catch {
        /* ignore */
      }

      await refreshUser()
      setSaved(true)
      setIsCollapsed(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving radius', error)
      alert('Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  const isMaster = user.role === 'master'
  const radiusMeters = radius * 1000
  const hasSavedData = isMaster ? position !== null : (user.service_radius_km != null && user.service_radius_km > 0)
  const title = isMaster ? 'Геолокация и радиус' : 'Радиус поиска'
  const subtitle = isMaster
    ? 'Точка выезда и максимальное расстояние для заказов и поиска'
    : 'На каком расстоянии показывать мастеров и товары. Если не указать — видны все.'

  if (isCollapsed && hasSavedData) {
    return (
      <div className="card p-4">
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <FiMapPin className="text-brand-accent" />
          {title}
        </h3>
        <p className="text-sm text-text-secondary mb-3">
          {isMaster
            ? `Радиус ${radius} км от точки выезда настроен`
            : `Радиус поиска ${radius} км`}
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
        {title}
      </h3>
      <p className="text-sm text-text-secondary mb-4">
        {subtitle}
      </p>

      <p className="text-[11px] text-text-secondary mb-3">
        Перетащите метку пальцем. Радиус меняется щипком (зумом) по карте.
      </p>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Точка на карте</label>
          <p className="text-xs text-text-secondary mb-2">
            {isMaster
              ? 'Адрес выезда или просто передвиньте метку'
              : 'Передвиньте метку туда, откуда считать поиск'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Например: Урус-Мартан, ул. Ленина"
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

        <div className="relative rounded-lg overflow-hidden border border-border-light/60 bg-bg-secondary touch-none" style={{ height: 320 }}>
          {typeof window !== 'undefined' && (
            <MapContainer
              center={position ?? mapCenter}
              zoom={position ? 11 : DEFAULT_ZOOM}
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
              <ChangeMapView
                center={position ?? mapCenter}
                zoom={14}
                radiusKm={radius}
                fitToken={fitToken}
              />
              <RadiusMapGestures
                center={position ?? mapCenter}
                onCenterChange={(lat, lng) => {
                  const pos: [number, number] = [lat, lng]
                  setPosition(pos)
                  setMapCenter(pos)
                }}
                onRadiusChange={setRadius}
              />
              <Circle
                center={position ?? mapCenter}
                radius={radiusMeters}
                pathOptions={{
                  color: 'var(--brand-accent, #e11d48)',
                  fillColor: 'var(--brand-accent, #e11d48)',
                  fillOpacity: 0.15,
                  weight: 2,
                }}
              />
            </MapContainer>
          )}
        </div>
        <p className="text-xs text-text-secondary">
          Зона {radius} км{position ? ` · ${position[0].toFixed(4)}, ${position[1].toFixed(4)}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {RADIUS_OPTIONS.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => {
              setRadius(option)
              setFitToken((n) => n + 1)
            }}
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
