'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { IconType } from 'react-icons'
import { FiCheck, FiClipboard, FiShoppingBag, FiStar, FiChevronRight, FiBell, FiPlus } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { getMasterAccess } from '@/lib/masterAccess'
import { distanceKm } from '@/lib/onboarding'
import OnboardingShell, { OnbPrimaryButton, OnbSkipButton } from './OnboardingShell'
import type { OnboardingStepProps } from './types'

type CheckItem = { label: string; done: boolean; fixHref?: string }

function ActionCard({
  icon: Icon,
  title,
  desc,
  href,
  accent,
}: {
  icon: IconType
  title: string
  desc: string
  href?: string
  accent?: boolean
}) {
  const body = (
    <>
      <span
        className={[
          'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
          accent ? 'bg-brand-accent text-white' : 'bg-[#f4f4f4] text-[#1c1c1e]',
        ].join(' ')}
      >
        <Icon size={20} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-bold text-[#1c1c1e]">{title}</span>
        <span className="block text-[13px] text-[#6e6e73] leading-snug">{desc}</span>
      </span>
      {href && <FiChevronRight className="text-[#c7c7cc] shrink-0" size={20} />}
    </>
  )
  const cls = 'w-full rounded-2xl bg-white p-4 shadow-sm flex items-center gap-3 text-left'
  return href ? (
    <Link href={href} className={`${cls} active:scale-[0.99] transition-transform`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export default function StepDone({ user, index, total, onBack, onFinish }: OnboardingStepProps) {
  const isSeller = user.role === 'seller'
  const [ordersNearby, setOrdersNearby] = useState<number | null>(null)
  const [catalogCount, setCatalogCount] = useState<number | null>(null)

  useEffect(() => {
    const table = isSeller ? 'profile_product_categories' : 'profile_subcategories'
    supabase
      .from(table)
      .select('profile_id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .then(({ count }) => setCatalogCount(count ?? 0))
  }, [isSeller, user.id])

  useEffect(() => {
    if (isSeller || user.master_lat == null || user.master_lng == null) return
    const lat = user.master_lat
    const lng = user.master_lng
    const r = user.service_radius_km || 25
    const dLat = r / 111
    const dLng = r / Math.max(20, 111 * Math.cos((lat * Math.PI) / 180))
    supabase
      .from('orders')
      .select('lat, lng')
      .in('status', ['open', 'new'])
      .gte('lat', lat - dLat)
      .lte('lat', lat + dLat)
      .gte('lng', lng - dLng)
      .lte('lng', lng + dLng)
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
          setOrdersNearby(null)
          return
        }
        const n = (data || []).filter(
          (o: { lat: number | null; lng: number | null }) =>
            o.lat != null && o.lng != null && distanceKm(lat, lng, o.lat, o.lng) <= r
        ).length
        setOrdersNearby(n)
      })
  }, [isSeller, user.master_lat, user.master_lng, user.service_radius_km])

  const access = getMasterAccess(user)
  const trialDaysLeft = Math.max(0, Math.ceil((access.trialEndsAt.getTime() - Date.now()) / 86_400_000))
  const showTrial = !access.isPro && access.isTrial && trialDaysLeft > 0

  const checks: CheckItem[] = isSeller
    ? [
        { label: 'Название магазина', done: Boolean(user.full_name?.trim()) },
        { label: 'Адрес на карте', done: user.seller_lat != null, fixHref: '/settings?open=store' },
        { label: 'Категории товаров', done: (catalogCount ?? 0) > 0, fixHref: '/onboarding/seller' },
        { label: 'Логотип', done: Boolean(user.avatar_url), fixHref: '/settings?open=profile' },
      ]
    : [
        { label: 'Направления работы', done: (catalogCount ?? 0) > 0, fixHref: '/settings?open=specializations' },
        { label: 'Зона выезда', done: user.master_lat != null, fixHref: '/settings?open=location' },
        { label: 'Фото профиля', done: Boolean(user.avatar_url), fixHref: '/settings?open=profile' },
      ]

  const allDone = catalogCount != null && checks.every((c) => c.done)

  return (
    <OnboardingShell
      total={total}
      current={index}
      stepKey="done"
      onBack={onBack}
      title={allDone ? 'Всё готово!' : 'Почти готово'}
      subtitle={
        isSeller
          ? 'Магазин создан. Осталось добавить товары — и покупатели начнут писать.'
          : 'Профиль создан. Клиенты рядом уже могут вас найти.'
      }
      footer={
        isSeller ? (
          <>
            <OnbPrimaryButton tone="success" onClick={() => onFinish('/products/new')}>
              <FiPlus size={18} /> Добавить первый товар
            </OnbPrimaryButton>
            <OnbSkipButton onClick={() => onFinish('/products')}>Позже, открыть каталог</OnbSkipButton>
          </>
        ) : (
          <>
            <OnbPrimaryButton tone="success" onClick={() => onFinish('/orders')}>
              Смотреть заказы
            </OnbPrimaryButton>
            <OnbSkipButton onClick={() => onFinish('/feed')}>Перейти в ленту</OnbSkipButton>
          </>
        )
      }
    >
      <div className="flex justify-center my-4">
        <span className="w-20 h-20 rounded-full bg-[#1f9d55] text-white flex items-center justify-center shadow-[0_12px_32px_rgba(31,157,85,0.35)] animate-slide-in-up">
          <FiCheck size={40} strokeWidth={3} />
        </span>
      </div>

      <div className="rounded-2xl bg-white shadow-sm divide-y divide-[#f0f0f2] mb-4">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-3 px-4 h-12">
            <span
              className={[
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                c.done ? 'bg-[#1f9d55] text-white' : 'border-2 border-[#d1d1d6]',
              ].join(' ')}
            >
              {c.done && <FiCheck size={14} strokeWidth={3} />}
            </span>
            <span className={`flex-1 text-[14px] ${c.done ? 'text-[#1c1c1e]' : 'text-[#6e6e73]'}`}>{c.label}</span>
            {!c.done && c.fixHref && catalogCount != null && (
              <Link href={c.fixHref} className="text-[13px] font-semibold text-brand-accent">
                Добавить
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {!isSeller &&
          (ordersNearby == null ? null : ordersNearby > 0 ? (
            <ActionCard
              icon={FiClipboard}
              accent
              title={`Заказы в вашей зоне: ${ordersNearby}`}
              desc="Откликнитесь первым — клиенты чаще выбирают быстрых"
              href="/orders"
            />
          ) : (
            <ActionCard
              icon={FiBell}
              title="Новых заказов рядом пока нет"
              desc="Пришлём уведомление, как только появится заказ в вашей зоне"
            />
          ))}
        {!isSeller && (
          <ActionCard
            icon={FiShoppingBag}
            title="Материалы и инструменты"
            desc="Товары от продавцов рядом с вами"
            href="/products"
          />
        )}
        {showTrial && (
          <ActionCard
            icon={FiStar}
            title={`PRO бесплатно ещё ${trialDaysLeft} дн.`}
            desc={isSeller ? 'Приоритет в каталоге и расширенная витрина' : 'Новые заказы сразу и отклики без ограничений'}
            href="/pro"
          />
        )}
      </div>
    </OnboardingShell>
  )
}
