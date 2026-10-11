export type VayPlatform = 'ios' | 'android' | 'web'

export const VAY_PLATFORM_HEADER = 'x-vay-platform'

/** Сервер: платформа из заголовка клиента. */
export function platformFromRequest(request: Request): VayPlatform {
  const raw = (request.headers.get(VAY_PLATFORM_HEADER) || '').toLowerCase().trim()
  if (raw === 'ios' || raw === 'android' || raw === 'web') return raw
  return 'web'
}

/** Внешняя оплата цифрового PRO в store-приложениях запрещена (путь A). */
export function isStoreNativePlatform(platform: VayPlatform): boolean {
  return platform === 'ios' || platform === 'android'
}
