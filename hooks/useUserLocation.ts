'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/providers'

export function useUserLocation() {
  const { user } = useAuth()
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [locationReady, setLocationReady] = useState(false)

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

  const lat = user?.master_lat ?? geo?.lat ?? null
  const lng = user?.master_lng ?? geo?.lng ?? null
  const radiusKm = user?.service_radius_km ?? 50
  const city = user?.city ?? null

  return { lat, lng, radiusKm, city, locationReady }
}
