'use client'

import { useEffect } from 'react'
import { isNativeApp } from '@/lib/nativeApp'

/**
 * Нативные хуки для Capacitor WebView:
 * - статус-бар
 * - кнопка «Назад» Android → history.back / закрытие
 * - класс на html для safe-area CSS
 */
export default function NativeAppShell() {
  useEffect(() => {
    if (!isNativeApp()) return

    document.documentElement.classList.add('native-app')

    let removeBack: (() => void) | undefined

    const boot = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => undefined)
      } catch {
        /* web or plugin missing */
      }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide().catch(() => undefined)
      } catch {
        /* ignore */
      }

      try {
        const { App } = await import('@capacitor/app')
        const handle = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack || window.history.length > 1) {
            window.history.back()
          } else {
            App.exitApp().catch(() => undefined)
          }
        })
        removeBack = () => {
          handle.remove()
        }
      } catch {
        /* ignore */
      }
    }

    void boot()

    return () => {
      document.documentElement.classList.remove('native-app')
      removeBack?.()
    }
  }, [])

  return null
}
