import { createClient } from '@supabase/supabase-js'
import { haversineKm } from '@/lib/geo'

/** Id мастеров, чья зона обслуживания покрывает точку (lat, lng). */
export async function findMasterIdsServingLocation(lat: number, lng: number): Promise<string[]> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: masters, error } = await supabaseAdmin
    .from('profiles')
    .select('id, master_lat, master_lng, service_radius_km')
    .eq('role', 'master')
    .not('master_lat', 'is', null)
    .not('master_lng', 'is', null)
    .not('service_radius_km', 'is', null)

  if (error) throw error

  const radiusKmDefault = 50
  const profileIds: string[] = []

  for (const m of masters || []) {
    const mLat = Number(m.master_lat)
    const mLng = Number(m.master_lng)
    const radiusKm = Number(m.service_radius_km) || radiusKmDefault
    if (!Number.isFinite(mLat) || !Number.isFinite(mLng) || radiusKm <= 0) continue
    if (haversineKm(lat, lng, mLat, mLng) <= radiusKm) {
      profileIds.push(m.id)
    }
  }

  return profileIds
}
