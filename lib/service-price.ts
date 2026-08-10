/** Цена мастера за услугу: единицы и форматирование. */

export type ServicePriceUnit = 'm' | 'm2' | 'm3'

export const SERVICE_PRICE_UNITS: Array<{ value: ServicePriceUnit; label: string }> = [
  { value: 'm', label: 'м' },
  { value: 'm2', label: 'м²' },
  { value: 'm3', label: 'м³' },
]

export type ProfileServicePriceRow = {
  price?: number | string | null
  price_unit?: string | null
  service?: { id?: string; name?: string | null; slug?: string | null } | null
  service_id?: string | null
}

export function isServicePriceUnit(v: unknown): v is ServicePriceUnit {
  return v === 'm' || v === 'm2' || v === 'm3'
}

export function unitLabel(unit: ServicePriceUnit | string | null | undefined): string {
  if (unit === 'm') return 'м'
  if (unit === 'm2') return 'м²'
  if (unit === 'm3') return 'м³'
  return ''
}

export function formatServicePrice(
  price: number | string | null | undefined,
  unit: ServicePriceUnit | string | null | undefined
): string | null {
  const n = typeof price === 'string' ? Number(price) : price
  if (n == null || !Number.isFinite(n) || n < 0) return null
  const formatted = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n)
  const u = unitLabel(unit)
  return u ? `${formatted} ₽/${u}` : `${formatted} ₽`
}

/** Цена под запрос: выбранные service id, иначе совпадение имени услуги с q. */
export function pickMatchedServicePrice(
  rows: ProfileServicePriceRow[] | null | undefined,
  opts: { serviceIds?: string[]; q?: string } = {}
): { price: number; unit: ServicePriceUnit | null; serviceName: string; label: string } | null {
  if (!rows?.length) return null

  const ids = (opts.serviceIds || []).filter(Boolean)
  let match: ProfileServicePriceRow | undefined

  if (ids.length > 0) {
    match = rows.find((r) => {
      const sid = r.service?.id || r.service_id
      return sid && ids.includes(sid) && r.price != null
    })
  }

  const q = (opts.q || '').trim().toLowerCase()
  if (!match && q.length >= 2) {
    match = rows.find((r) => {
      const name = (r.service?.name || '').toLowerCase()
      return name.includes(q) && r.price != null
    })
  }

  if (!match || match.price == null) return null
  const n = typeof match.price === 'string' ? Number(match.price) : match.price
  if (!Number.isFinite(n) || n < 0) return null
  const unit = isServicePriceUnit(match.price_unit) ? match.price_unit : null
  const label = formatServicePrice(n, unit)
  if (!label) return null
  return {
    price: n,
    unit,
    serviceName: match.service?.name || '',
    label,
  }
}

export function parsePriceInput(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}
