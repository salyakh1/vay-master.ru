'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

function PaymentSuccessInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const [status, setStatus] = useState<'loading' | 'ok' | 'wait' | 'err'>('loading')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setStatus('err')
      setMsg('Нет параметра сессии')
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 40

    const poll = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setStatus('err')
        setMsg('Войдите в аккаунт')
        return
      }

      const tick = async () => {
        if (cancelled) return
        attempts += 1
        try {
          const res = await fetch(`/api/payments/session-status?sessionId=${encodeURIComponent(sessionId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await res.json()
          if (!res.ok) {
            setStatus('err')
            setMsg(data.error || 'Ошибка')
            return
          }
          if (data.status === 'paid' && data.orderId) {
            setStatus('ok')
            setOrderId(data.orderId)
            router.replace(`/orders/${data.orderId}`)
            return
          }
          if (attempts >= maxAttempts) {
            setStatus('wait')
            setMsg('Оплата обрабатывается. Обновите страницу заказов через минуту.')
            return
          }
          setTimeout(tick, 1500)
        } catch {
          if (attempts >= maxAttempts) {
            setStatus('err')
            setMsg('Не удалось проверить оплату')
            return
          }
          setTimeout(tick, 2000)
        }
      }
      tick()
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [sessionId, router])

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-lg text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-2 border-brand-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Проверяем оплату…</p>
          </>
        )}
        {status === 'ok' && orderId && (
          <p className="text-graphite-secondary">Переход к заказу…</p>
        )}
        {status === 'wait' && (
          <>
            <p className="text-text-secondary mb-4">{msg}</p>
            <Link href="/orders" className="btn btn-primary">
              К заказам
            </Link>
          </>
        )}
        {status === 'err' && (
          <>
            <p className="text-red-600 mb-4">{msg}</p>
            <Link href="/orders/new" className="btn btn-outline">
              Назад к созданию
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg-primary">
          <div className="text-text-secondary">Загрузка…</div>
        </div>
      }
    >
      <PaymentSuccessInner />
    </Suspense>
  )
}
