'use client'

import { nativePlatform } from '@/lib/nativeApp'
import { VAY_PLATFORM_HEADER } from '@/lib/platformPolicy'

/** Клиентский заголовок для API (защита store-policy). */
export function vayPlatformHeaders(): HeadersInit {
  return { [VAY_PLATFORM_HEADER]: nativePlatform() }
}
