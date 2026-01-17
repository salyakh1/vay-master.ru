'use client'

import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { formatRemaining, getMasterAccess } from '@/lib/masterAccess'

export default function ProPage() {
  const { user } = useAuth()
  const router = useRouter()

  const access = useMemo(() => (user ? getMasterAccess(user) : null), [user])
  const [trialCountdown, setTrialCountdown] = useState<string | null>(null)

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
            <p className="text-text-secondary leading-relaxed mb-6">
              PRO снимает ограничения и даёт больше возможностей мастерам и продавцам. Оплату/подписку подключим на следующем шаге — сейчас эта страница служит как точка входа из напоминаний.
            </p>

            <div className="grid gap-4">
              <div className="bg-bg-card rounded-lg border border-border-light/60 p-4">
                <div className="font-semibold text-graphite-secondary mb-1">PRO Мастер</div>
                <ul className="text-sm text-text-secondary leading-relaxed space-y-1">
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

            <div className="mt-6 flex gap-3">
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (user?.id) router.push(`/profile/${user.id}`)
                  else router.push('/auth/login')
                }}
              >
                Оформить PRO (скоро)
              </button>
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

