'use client'

export type ProFeatureFlags = {
  disableMasterRestrictions: boolean
  disableSellerRestrictions: boolean
}

let cached: ProFeatureFlags | null = null
let inFlight: Promise<ProFeatureFlags> | null = null

export async function getProFeatureFlags(): Promise<ProFeatureFlags> {
  if (cached) return cached
  if (inFlight) return inFlight

  inFlight = fetch('/api/pro/settings', { method: 'GET' })
    .then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch PRO settings')
      const data = await res.json()
      const flags: ProFeatureFlags = {
        disableMasterRestrictions: !!data?.disableMasterRestrictions,
        disableSellerRestrictions: !!data?.disableSellerRestrictions,
      }
      cached = flags
      return flags
    })
    .catch(() => {
      // безопасный дефолт: ограничения включены
      cached = { disableMasterRestrictions: false, disableSellerRestrictions: false }
      return cached
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

export function clearProFeatureFlagsCache() {
  cached = null
  inFlight = null
}

export function restrictionsDisabledForRole(role: string | undefined, flags: ProFeatureFlags | null | undefined) {
  if (!role || !flags) return false
  if (role === 'master') return flags.disableMasterRestrictions
  if (role === 'seller') return flags.disableSellerRestrictions
  return false
}

