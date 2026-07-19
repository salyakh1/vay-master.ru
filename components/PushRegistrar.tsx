'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/**
 * Регистрирует SW и (при разрешении) сохраняет Web Push подписку.
 * Не показывает свой prompt — только если Notification.permission === 'granted'
 * или пользователь включил push в настройках (localStorage flag).
 */
export default function PushRegistrar() {
  const { user } = useAuth()
  const done = useRef(false)

  useEffect(() => {
    if (!user || done.current) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    let cancelled = false

    ;(async () => {
      try {
        await navigator.serviceWorker.register('/sw.js')
        if (cancelled) return

        const wantPush =
          localStorage.getItem('vay_push_enabled') === '1' ||
          Notification.permission === 'granted'

        if (!wantPush) return

        const vapidRes = await fetch('/api/push/vapid')
        const vapid = await vapidRes.json()
        if (!vapid?.enabled || !vapid.publicKey) return

        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') return
        }
        if (Notification.permission !== 'granted') return

        const reg = await navigator.serviceWorker.ready
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
          })
        }

        const { data: session } = await supabase.auth.getSession()
        const token = session.session?.access_token
        if (!token) return

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(sub.toJSON()),
        })

        localStorage.setItem('vay_push_enabled', '1')
        done.current = true
      } catch (e) {
        console.warn('[PushRegistrar]', e)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user])

  return null
}
