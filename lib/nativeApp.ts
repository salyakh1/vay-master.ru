'use client'

/** Детект оболочки Capacitor (Android / iOS). */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return Boolean(cap?.isNativePlatform?.())
}

/** Лёгкая вибрация при выборе; в браузере — no-op. */
export function hapticTap(): void {
  if (!isNativeApp()) return
  import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
    .catch(() => {})
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'
  const cap = (window as Window & {
    Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean }
  }).Capacitor
  if (!cap?.isNativePlatform?.()) return 'web'
  const p = cap.getPlatform?.()
  if (p === 'ios' || p === 'android') return p
  return 'web'
}
