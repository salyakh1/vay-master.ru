'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/app/providers'

const RADIUS_STORAGE_KEY = 'vay_search_radius_km'
export const DEFAULT_RADIUS_KM = 50

export function useUserLocation() {
  const { user } = useAuth()
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [originOverride, setOriginOverride] = useState<{ lat: number; lng: number } | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [radiusOverride, setRadiusOverride] = useState<number | null>(null)
  const [radiusReady, setRadiusReady] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RADIUS_STORAGE_KEY)
      const parsed = saved ? Number(saved) : NaN
      if (!Number.isNaN(parsed) && parsed > 0) {
        setRadiusOverride(parsed)
      }
    } catch {
      /* ignore */
    }
    try {
      const savedView = localStorage.getItem('vay_nearby_view')
      if (savedView) {
        const { lat, lng } = JSON.parse(savedView) as { lat?: number; lng?: number }
        if (typeof lat === 'number' && typeof lng === 'number') {
          setOriginOverride({ lat, lng })
          setGeo({ lat, lng })
        }
      }
    } catch {
      /* ignore */
    }
    setRadiusReady(true)
  }, [])

  useEffect(() => {
    if (user?.master_lat != null && user?.master_lng != null) {
      setLocationReady(true)
      return
    }

    if (typeof window === 'undefined') {
      setLocationReady(true)
      return
    }

    let finished = false
    const finish = () => {
      if (!finished) {
        finished = true
        setLocationReady(true)
      }
    }

    try {
      const saved = localStorage.getItem('vay_nearby_view')
      if (saved) {
        const { lat, lng } = JSON.parse(saved) as { lat?: number; lng?: number }
        if (typeof lat === 'number' && typeof lng === 'number') {
          setGeo({ lat, lng })
          finish()
          return
        }
      }
    } catch {
      /* ignore */
    }

    if (!navigator.geolocation) {
      finish()
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        finish()
      },
      () => finish(),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    )

    const fallback = setTimeout(finish, 5200)
    return () => clearTimeout(fallback)
  }, [user])

  const setRadiusKm = useCallback((km: number) => {
    setRadiusOverride(km)
    try {
      localStorage.setItem(RADIUS_STORAGE_KEY, String(km))
    } catch {
      /* ignore */
    }
  }, [])

  const setOrigin = useCallback((nextLat: number, nextLng: number) => {
    setGeo({ lat: nextLat, lng: nextLng })
    setOriginOverride({ lat: nextLat, lng: nextLng })
    try {
      localStorage.setItem('vay_nearby_view', JSON.stringify({ lat: nextLat, lng: nextLng }))
    } catch {
      /* ignore */
    }
  }, [])

  const lat = originOverride?.lat ?? user?.master_lat ?? geo?.lat ?? null
  const lng = originOverride?.lng ?? user?.master_lng ?? geo?.lng ?? null
  const radiusConfigured =
    radiusOverride != null || (user?.service_radius_km != null && user.service_radius_km > 0)
  const radiusKm = radiusConfigured ? radiusOverride ?? user?.service_radius_km ?? null : null
  const city = user?.city ?? null

  return { lat, lng, radiusKm, radiusConfigured, radiusReady, city, locationReady, setRadiusKm, setOrigin }
}
