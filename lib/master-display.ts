/** Общие хелперы отображения мастера (карточки grid/list). */

export const MASTER_SPECS_LIMIT = 3
export const MASTER_AVATAR_ALT_FALLBACK = 'Фотография мастера'

type SpecsSource = {
  specialization?: string | null
  description?: string | null
  profile_subcategories?: Array<{ subcategory?: { name?: string | null } | null }> | null
  profile_services?: Array<{ service?: { name?: string | null } | null }> | null
}

export function getInitials(fullName?: string | null, fallback = '?'): string {
  const initials = fullName
    ?.split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return initials || fallback
}

export function getMasterSpecs(master: SpecsSource, limit = MASTER_SPECS_LIMIT): string {
  const fromServices = Array.isArray(master.profile_services)
    ? master.profile_services
        .map((item) => item.service?.name?.trim())
        .filter((name): name is string => Boolean(name))
        .slice(0, limit)
        .join(' · ')
    : ''
  if (fromServices) return fromServices

  const fromSubs = Array.isArray(master.profile_subcategories)
    ? master.profile_subcategories
        .map((item) => item.subcategory?.name?.trim())
        .filter((name): name is string => Boolean(name))
        .slice(0, limit)
        .join(' · ')
    : ''
  if (fromSubs) return fromSubs
  if (master.specialization?.trim()) return master.specialization.trim()
  if (master.description?.trim()) return master.description.trim().slice(0, 40)
  return ''
}

export function getMasterAvatarAlt(fullName?: string | null): string {
  const name = fullName?.trim()
  return name || MASTER_AVATAR_ALT_FALLBACK
}
