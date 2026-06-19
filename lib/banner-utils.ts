import type { AdBanner } from '@/lib/supabase'

/** Скрывает очевидные тестовые/черновые баннеры в публичной выдаче. */
export function isProductionReadyBanner(banner: AdBanner | Record<string, unknown>): boolean {
  const title = String(banner.title ?? '').trim()
  const description = String(banner.description ?? '').trim()
  const badge = String((banner as AdBanner).badge_text ?? '').trim()

  if (/^\d{1,4}$/.test(title) && /^\d{1,4}$/.test(description)) return false
  if (title === '22' || title === '11' || description === '22' || description === '11') return false
  if (badge === 'test' || badge === 'TEST') return false
  if (title.toLowerCase() === 'test' || title.toLowerCase() === 'тест') return false

  return true
}

export function filterProductionBanners<T extends AdBanner | Record<string, unknown>>(banners: T[]): T[] {
  return banners.filter(isProductionReadyBanner)
}
