'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/app/providers'

const RADIUS_STORAGE_KEY = 'vay_search_radius_km'

export function useUserLocation() {
  const { user } = useAuth()
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [radiusOverride, setRadiusOverride] = useState<number | null>(null)

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

  const lat = user?.master_lat ?? geo?.lat ?? null
  const lng = user?.master_lng ?? geo?.lng ?? null
  const radiusKm = radiusOverride ?? user?.service_radius_km ?? 50
  const city = user?.city ?? null

  return { lat, lng, radiusKm, city, locationReady, setRadiusKm }
}
