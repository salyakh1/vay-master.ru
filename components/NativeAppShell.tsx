'use client'

import { useEffect } from 'react'
import { isNativeApp } from '@/lib/nativeApp'

/**
 * Нативные хуки для Capacitor WebView:
 * - статус-бар
 * - кнопка «Назад» Android → history.back / закрытие
 * - класс на html для safe-area CSS
 * - регистрация push (после google-services.json / APNs)
 */
export default function NativeAppShell() {
  useEffect(() => {
    if (!isNativeApp()) return

    document.documentElement.classList.add('native-app')

    let removeBack: (() => void) | undefined
    let removePush: (() => void) | undefined

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

      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        const perm = await PushNotifications.requestPermissions()
        if (perm.receive === 'granted') {
          await PushNotifications.register()
        }
        const reg = await PushNotifications.addListener('registration', (token) => {
          // Токен устройства: подключите сохранение в API после Firebase/APNs
          console.info('[push] device token', token.value)
        })
        const err = await PushNotifications.addListener('registrationError', (e) => {
          console.warn('[push] registration error', e)
        })
        removePush = () => {
          reg.remove()
          err.remove()
        }
      } catch {
        /* plugin not installed / not configured yet */
      }
    }

    void boot()

    return () => {
      document.documentElement.classList.remove('native-app')
      removeBack?.()
      removePush?.()
    }
  }, [])

  return null
}
