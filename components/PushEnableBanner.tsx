'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/providers'
import { enableWebPush } from '@/lib/webPushClient'

const DISMISS_KEY = 'vay_push_banner_dismissed_until'

function isDismissed(): boolean {
  if (typeof window === 'undefined') return true
  const until = localStorage.getItem(DISMISS_KEY)
  if (!until) return false
  return Date.now() < Number(until)
}

function dismiss(days = 7) {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000))
}

/**
 * Баннер «Включить уведомления» — один раз после входа, если push ещё не включён.
 */
export default function PushEnableBanner() {
  const { user, loading } = useAuth()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [vapidOk, setVapidOk] = useState(false)

  useEffect(() => {
    if (loading || !user) {
      setVisible(false)
      return
    }
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (localStorage.getItem('vay_push_enabled') === '1') return
    if (Notification.permission === 'granted') return
    if (isDismissed()) return

    fetch('/api/push/vapid')
      .then((r) => r.json())
      .then((j) => {
        if (j?.enabled) {
          setVapidOk(true)
          setVisible(true)
        }
      })
      .catch(() => {})
  }, [user, loading])

  if (!visible || !vapidOk) return null

  const onEnable = async () => {
    setBusy(true)
    const res = await enableWebPush()
    setBusy(false)
    if (res.ok) {
      setVisible(false)
    } else {
      alert(res.error || 'Не удалось включить уведомления')
    }
  }

  const onLater = () => {
    dismiss(7)
    setVisible(false)
  }

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[60] max-w-lg mx-auto md:bottom-6">
      <div className="bg-[#1c1c1e] text-white rounded-2xl shadow-lg border border-white/10 px-4 py-3.5 flex flex-col gap-2.5">
        <p className="text-[13px] font-semibold leading-snug">
          Включить уведомления?
        </p>
        <p className="text-[11px] text-[#aeaeb2] leading-relaxed">
          Заказы, отклики и сообщения в чатах — на телефон, без email.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onEnable()}
            className="flex-1 bg-brand-accent text-white text-[12px] font-bold py-2.5 rounded-xl active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? '…' : 'Включить'}
          </button>
          <button
            type="button"
            onClick={onLater}
            className="px-4 text-[12px] font-medium text-[#aeaeb2] py-2.5"
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  )
}
