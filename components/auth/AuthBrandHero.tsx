'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FiStar, FiMessageCircle, FiShield } from 'react-icons/fi'

const BENEFITS = [
  {
    icon: FiStar,
    title: 'Проверенные мастера',
    desc: 'Рейтинги и отзывы после заказов',
  },
  {
    icon: FiMessageCircle,
    title: 'Прямой чат',
    desc: 'Договоритесь без посредников',
  },
  {
    icon: FiShield,
    title: 'Модерация профилей',
    desc: 'Безопасность и поддержка 24/7',
  },
] as const

type AuthBrandHeroProps = {
  subtitle?: string
}

/** Брендированная шапка для страниц входа / регистрации */
export default function AuthBrandHero({
  subtitle = 'Мастера, материалы и заказы — в одном приложении. Найдите специалиста рядом за пару минут.',
}: AuthBrandHeroProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#111111] via-[#1c1c1e] to-[#8b2e28] text-white">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, white 1px, transparent 1px),
            radial-gradient(circle at 70% 60%, white 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />
      <div className="absolute -top-24 -right-20 w-64 h-64 rounded-full bg-brand-accent/30 blur-3xl" aria-hidden />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 blur-2xl" aria-hidden />

      <div className="relative z-10 px-5 pt-10 pb-14">
        <Link href="/" className="inline-flex items-center gap-3 mb-7 group">
          <div className="w-12 h-12 rounded-2xl bg-white/12 border border-white/20 overflow-hidden backdrop-blur-md shadow-lg group-active:scale-95 transition-transform flex-shrink-0">
            <Image
              src="/icon.jpg"
              alt="VayMaster"
              width={48}
              height={48}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="text-left">
            <div className="text-[19px] font-extrabold tracking-wide leading-none">
              VAY<span className="text-white/75">-</span>MASTER
            </div>
            <div className="text-[10px] font-semibold text-white/55 uppercase tracking-[0.14em] mt-1">
              мастера · заказы · материалы
            </div>
          </div>
        </Link>

        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold leading-tight mb-2 tracking-tight text-white">
              Ваш надёжный сервис для дома и ремонта
            </h1>
            <p className="text-sm text-white/80 leading-relaxed max-w-[300px]">{subtitle}</p>
          </div>

          <div className="flex-shrink-0 w-[108px] h-[108px] relative" aria-hidden>
            <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-lg">
              <rect x="28" y="48" width="64" height="52" rx="6" fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.35" strokeWidth="1.5" />
              <path d="M38 48 L60 28 L82 48" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinejoin="round" />
              <rect x="52" y="68" width="16" height="20" rx="2" fill="white" fillOpacity="0.2" />
              <circle cx="88" cy="36" r="14" fill="#C7362F" fillOpacity="0.9" />
              <path d="M82 36 H94 M88 30 V42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M18 78 L26 70 L34 82 L42 74" stroke="white" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </div>

        <ul className="mt-7 space-y-2.5">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <li
              key={title}
              className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/10 px-3 py-2.5 backdrop-blur-sm"
            >
              <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Icon size={17} strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-bold leading-tight">{title}</div>
                <div className="text-[11px] text-white/65 leading-snug">{desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
