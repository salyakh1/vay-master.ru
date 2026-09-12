/** Нормализация города для сопоставления «Урус-Мартан» / «урус-мартан» / «г. Урус-Мартан». */
export function normalizeCity(city?: string | null): string {
  return (city || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/г\.\s*/g, '')
    .replace(/[^a-zа-я0-9]/g, '')
}

type CategoryRef = { slug?: string | null } | { slug?: string | null }[] | null | undefined

function categorySlugOf(item: { category_ref?: CategoryRef }): string {
  const ref = item.category_ref
  if (!ref) return ''
  if (Array.isArray(ref)) return ref[0]?.slug || ''
  return ref.slug || ''
}

/**
 * Чередует товары по категориям в заданном порядке,
 * чтобы полка кровельщика не заполнялась одним брусом.
 */
export function interleaveByCategoryOrder<T extends { category_ref?: CategoryRef }>(
  items: T[],
  categoryOrder: string[],
  limit: number
): T[] {
  const buckets = new Map<string, T[]>()
  for (const slug of categoryOrder) buckets.set(slug, [])
  const other: T[] = []

  for (const item of items) {
    const slug = categorySlugOf(item)
    const bucket = slug ? buckets.get(slug) : undefined
    if (bucket) bucket.push(item)
    else other.push(item)
  }

  const keys = [...categoryOrder, '__other']
  buckets.set('__other', other)

  const result: T[] = []
  while (result.length < limit) {
    let added = false
    for (const key of keys) {
      const next = buckets.get(key)?.shift()
      if (!next) continue
      result.push(next)
      added = true
      if (result.length >= limit) break
    }
    if (!added) break
  }
  return result
}
