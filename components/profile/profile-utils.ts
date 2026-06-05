import { differenceInYears } from 'date-fns'

export function yearsOnSite(createdAt?: string): string {
  if (!createdAt) return '—'
  const years = differenceInYears(new Date(), new Date(createdAt))
  if (years < 1) return '< 1 г'
  return `${years} г`
}

export function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
