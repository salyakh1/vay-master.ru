import type { Product } from '@/types/db'

/** URL страницы входа с возвратом после авторизации */
export function loginUrl(returnTo?: string): string {
  if (!returnTo) return '/auth/login'
  return `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
}

export function profileLoginUrl(profileId: string): string {
  return loginUrl(`/profile/${profileId}`)
}

/** Убирает телефон из объекта профиля для гостей */
export function stripPhone<T extends { phone?: string | null }>(
  profile: T | null | undefined
): T | null | undefined {
  if (!profile) return profile
  const { phone: _phone, ...rest } = profile
  return rest as T
}

export function sanitizeSellerForGuest<T extends { phone?: string | null }>(
  seller: T | null | undefined,
  isAuthenticated: boolean
): T | null | undefined {
  if (!seller || isAuthenticated) return seller
  return stripPhone(seller) ?? seller
}

export function sanitizeProductForGuest(product: Product, isAuthenticated: boolean): Product {
  if (isAuthenticated || !product.seller) return product
  return {
    ...product,
    seller: sanitizeSellerForGuest(product.seller as { phone?: string | null }, false) as Product['seller'],
  }
}

export function sanitizeProductsForGuest(products: Product[], isAuthenticated: boolean): Product[] {
  if (isAuthenticated) return products
  return products.map((p) => sanitizeProductForGuest(p, false))
}
