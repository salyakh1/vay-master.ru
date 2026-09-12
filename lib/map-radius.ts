/** Ограничение радиуса поиска / выезда, км */
export const MIN_SEARCH_RADIUS_KM = 1
export const MAX_SEARCH_RADIUS_KM = 200

export function clampRadiusKm(km: number): number {
  if (!Number.isFinite(km)) return MIN_SEARCH_RADIUS_KM
  return Math.round(Math.min(MAX_SEARCH_RADIUS_KM, Math.max(MIN_SEARCH_RADIUS_KM, km)))
}
