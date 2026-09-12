'use client'

import Link from 'next/link'
import { useAuth } from '@/app/providers'

type RadiusSetupBannerProps = {
  visible: boolean
  onSetup?: () => void
}

export default function RadiusSetupBanner({ visible, onSetup }: RadiusSetupBannerProps) {
  const { user } = useAuth()
  if (!visible) return null

  const loggedIn = !!user

  return (
    <div className="mx-3.5 mt-2 mb-1 rounded-2xl border border-[#f5d0d0] bg-[#fff5f5] px-3.5 py-3">
      <p className="text-[13px] font-semibold text-[#1c1c1e] leading-snug">Укажите радиус поиска</p>
      <p className="text-[11px] text-[#8e8e93] mt-0.5 leading-snug">
        Сейчас показываем всех мастеров и все товары. Настройте радиус — останутся только рядом с вами.
      </p>
      {loggedIn ? (
        <Link
          href="/settings?open=location"
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-brand-accent text-white text-[12px] font-bold px-3 py-2 active:scale-[0.98]"
        >
          Перейти в настройки
        </Link>
      ) : (
        <button
          type="button"
          onClick={onSetup}
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-brand-accent text-white text-[12px] font-bold px-3 py-2 active:scale-[0.98]"
        >
          Указать радиус
        </button>
      )}
    </div>
  )
}
