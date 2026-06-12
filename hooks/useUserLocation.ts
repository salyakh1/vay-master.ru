'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/providers'

export function useUserLocation() {
  const { user } = useAuth()
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (user?.master_lat != null && user?.master_lng != null) return
    if (typeof window === 'undefined' || !navigator.geolocation) return

    try {
      const saved = localStorage.getItem('vay_nearby_view')
      if (saved) {
        const { lat, lng } = JSON.parse(saved) as { lat?: number; lng?: number }
        if (typeof lat === 'number' && typeof lng === 'number') {
          setGeo({ lat, lng })
          return
        }
      }
    } catch {
      /* ignore */
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    )
  }, [user])

  const lat = user?.master_lat ?? geo?.lat ?? null
  const lng = user?.master_lng ?? geo?.lng ?? null
  const radiusKm = user?.service_radius_km ?? 50
  const city = user?.city ?? null

  return { lat, lng, radiusKm, city }
}
