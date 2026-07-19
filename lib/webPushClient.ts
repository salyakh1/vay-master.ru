'use client'

import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export async function enableWebPush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') return { ok: false, error: 'Только в браузере' }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, error: 'Браузер не поддерживает push' }
  }

  try {
    const vapidRes = await fetch('/api/push/vapid')
    const vapid = await vapidRes.json()
    if (!vapid?.enabled || !vapid.publicKey) {
      return { ok: false, error: 'Push ещё не настроен на сервере (VAPID)' }
    }

    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return { ok: false, error: 'Разрешение отклонено' }

    await navigator.serviceWorker.register('/sw.js')
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
    if (!token) return { ok: false, error: 'Нет сессии' }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(sub.toJSON()),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      return { ok: false, error: j.error || 'Ошибка сохранения' }
    }

    localStorage.setItem('vay_push_enabled', '1')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Ошибка' }
  }
}

export async function disableWebPush(): Promise<void> {
  try {
    localStorage.setItem('vay_push_enabled', '0')
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (token) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: sub?.endpoint }),
      })
    }
    await sub?.unsubscribe()
  } catch {
    /* ignore */
  }
}
