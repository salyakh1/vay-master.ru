'use client'

import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { formatRemaining, getMasterAccess } from '@/lib/masterAccess'
import { supabase } from '@/lib/supabase'

type ProSettings = {
  paymentProPurchaseEnabled: boolean
  proSubscriptionPriceRub: number
  proSubscriptionDays: number
  tinkoffReady: boolean
}

function ProPageInner() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentFail = searchParams.get('payment') === 'fail'

  const access = useMemo(() => (user ? getMasterAccess(user) : null), [user])
  const [trialCountdown, setTrialCountdown] = useState<string | null>(null)
  const [proSettings, setProSettings] = useState<ProSettings | null>(null)
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !access) {
      setTrialCountdown(null)
      return
    }

    // Бесплатная неделя для мастеров и продавцов
    if (user.role !== 'master' && user.role !== 'seller') {
      setTrialCountdown(null)
      return
    }

    if (access.isPro || !access.isTrial) {
      setTrialCountdown(null)
      return
    }

    const tick = () => {
      const remainingMs = access.trialEndsAt.getTime() - Date.now()
      const r = formatRemaining(remainingMs)
      setTrialCountdown(`${r.days}д ${r.hours}ч ${r.minutes}м`)
    }

    tick()
    const id = window.setInterval(tick, 60 * 1000)
    return () => window.clearInterval(id)
  }, [user, access])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/payment/pro-settings')
        const data = await res.json()
        if (cancelled) return
        setProSettings({
          paymentProPurchaseEnabled: Boolean(data.paymentProPurchaseEnabled),
          proSubscriptionPriceRub: Number(data.proSubscriptionPriceRub) || 990,
          proSubscriptionDays: Number(data.proSubscriptionDays) || 30,
          tinkoffReady: Boolean(data.tinkoffReady),
        })
      } catch {
        if (!cancelled) setProSettings(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const canPayPro =
    user &&
    (user.role === 'master' || user.role === 'seller') &&
    proSettings?.paymentProPurchaseEnabled &&
    proSettings?.tinkoffReady &&
    proSettings.proSubscriptionPriceRub > 0

  const startProCheckout = async () => {
    setPayError(null)
    setPayLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        router.push('/auth/login')
        return
      }
      const createRes = await fetch('/api/payments/tinkoff/create-pro-session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
      const createData = await createRes.json()
      if (!createRes.ok) {
        setPayError(createData.error || 'Не удалось создать оплату')
        return
      }
      const sessionId = createData.sessionId as string
      const initRes = await fetch('/api/payments/tinkoff/init', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })
      const initData = await initRes.json()
      if (!initRes.ok || !initData.paymentUrl) {
        setPayError(initData.error || 'Не удалось открыть оплату')
        return
      }
      window.location.href = initData.paymentUrl as string
    } catch (e: any) {
      setPayError(e?.message || 'Ошибка')
    } finally {
      setPayLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h1 className="text-2xl font-semibold text-graphite-secondary tracking-tight mb-3">
              PRO статус
            </h1>

            {trialCountdown && (
              <div className="mb-4 bg-bg-secondary/60 border border-brand-accent/25 rounded-lg p-4">
                <div className="text-sm text-text-secondary mb-1">
                  До конца бесплатного периода PRO:
                </div>
                <div className="text-lg font-semibold text-brand-accent">
                  {trialCountdown}
                </div>
              </div>
            )}
            {paymentFail && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                Оплата не завершена или отменена. Попробуйте снова.
              </div>
            )}

            <p className="text-text-secondary leading-relaxed mb-6">
              PRO снимает ограничения и даёт больше возможностей мастерам и продавцам. Оплатите период через Тинькофф — статус обновится сразу после подтверждения банка.
            </p>

            {proSettings && (
              <div className="mb-6 rounded-lg border border-border-light/60 bg-bg-secondary/40 px-4 py-3 text-sm text-text-secondary">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Период: <strong className="text-graphite-secondary">{proSettings.proSubscriptionDays} дн.</strong>
                  </span>
                  <span>
                    Стоимость:{' '}
                    <strong className="text-graphite-secondary">{proSettings.proSubscriptionPriceRub} ₽</strong>
                  </span>
                </div>
                {!proSettings.tinkoffReady && (
                  <p className="mt-2 text-amber-800">
                    Онлайн-оплата выключена в настройках или не настроен терминал (админка «Оплата» и переменные TINKOFF_*).
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4">
              <div className="bg-bg-card rounded-lg border border-border-light/60 p-4">
                <div className="font-semibold text-graphite-secondary mb-1">PRO Мастер</div>
                <ul className="text-sm text-text-secondary leading-relaxed space-y-1">
                  <li>- Новые заказы сразу (без ожидания 24 часов)</li>
                  <li>- Без лимитов на истории</li>
                  <li>- Без лимитов на публикации работ</li>
                  <li>- Отклики на заказы без ограничений</li>
                  <li>- Видит ФИО клиента в заказах</li>
                </ul>
              </div>
              <div className="bg-bg-card rounded-lg border border-border-light/60 p-4">
                <div className="font-semibold text-graphite-secondary mb-1">PRO Продавец</div>
                <ul className="text-sm text-text-secondary leading-relaxed space-y-1">
                  <li>- Продвижение и приоритет в каталоге</li>
                  <li>- Расширенная витрина</li>
                  <li>- Дополнительные промо‑места</li>
                </ul>
              </div>
            </div>

            {payError && (
              <p className="text-sm text-red-600 mb-4" role="alert">
                {payError}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {user && (user.role === 'master' || user.role === 'seller') ? (
                <button
                  type="button"
                  className="btn btn-primary disabled:opacity-60"
                  disabled={!canPayPro || payLoading}
                  onClick={() => void startProCheckout()}
                >
                  {payLoading ? 'Переход к оплате…' : 'Оплатить PRO'}
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => router.push('/auth/login')}>
                  Войти как мастер или продавец
                </button>
              )}
              {user?.id && (
                <Link href={`/profile/${user.id}`} className="btn btn-outline">
                  Профиль
                </Link>
              )}
              <Link href="/" className="btn btn-outline">
                На главную
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary pb-20">
          <Navbar />
          <div className="container mx-auto px-4 py-6 text-text-secondary">Загрузка…</div>
        </div>
      }
    >
      <ProPageInner />
    </Suspense>
  )
}
