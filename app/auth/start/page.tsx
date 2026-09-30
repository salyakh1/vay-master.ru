'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FiTool, FiShoppingBag, FiUser, FiCheck, FiArrowRight } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import type { UserRole } from '@/types/db'

const ROLES: Array<{ value: UserRole; title: string; desc: string; icon: IconType }> = [
  { value: 'master', title: 'Я мастер', desc: 'Беру заказы рядом, показываю работы', icon: FiTool },
  { value: 'seller', title: 'Я продавец', desc: 'Продаю инструменты и материалы', icon: FiShoppingBag },
  { value: 'client', title: 'Мне нужен мастер', desc: 'Найду специалиста или материалы', icon: FiUser },
]

export default function AuthStartPage() {
  const router = useRouter()
  const [role, setRole] = useState<UserRole | null>(null)

  return (
    <div className="min-h-screen bg-[#f4f4f4] max-w-lg mx-auto w-full flex flex-col">
      <div className="flex-1 px-5 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <Link href="/" className="inline-flex items-center gap-3 mb-8">
          <span className="w-11 h-11 rounded-2xl overflow-hidden shadow-sm bg-white">
            <Image src="/icon.jpg" alt="VayMaster" width={44} height={44} className="w-full h-full object-cover" priority />
          </span>
          <span className="text-[17px] font-extrabold tracking-wide text-[#1c1c1e]">
            VAY<span className="text-brand-accent">-</span>MASTER
          </span>
        </Link>

        <h1 className="font-display text-[26px] leading-tight font-extrabold text-[#1c1c1e] mb-2">
          Кто вы на платформе?
        </h1>
        <p className="text-[14px] text-[#6e6e73] mb-6">
          От этого зависит, что мы покажем вам в первую очередь. Сменить роль можно в настройках.
        </p>

        <div role="radiogroup" aria-label="Роль" className="space-y-3">
          {ROLES.map(({ value, title, desc, icon: Icon }) => {
            const selected = role === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRole(value)}
                className={[
                  'w-full flex items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left',
                  'transition-all duration-200 active:scale-[0.98]',
                  selected
                    ? 'border-brand-accent bg-[#fdf2f1] shadow-[0_6px_20px_rgba(199,54,47,0.12)]'
                    : 'border-transparent shadow-sm',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    selected ? 'bg-brand-accent text-white' : 'bg-[#f4f4f4] text-[#1c1c1e]',
                  ].join(' ')}
                >
                  <Icon size={22} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] font-bold text-[#1c1c1e]">{title}</span>
                  <span className="block text-[13px] text-[#6e6e73] leading-snug">{desc}</span>
                </span>
                <span
                  className={[
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                    selected ? 'bg-brand-accent border-brand-accent text-white' : 'border-[#d1d1d6]',
                  ].join(' ')}
                >
                  {selected && <FiCheck size={14} strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="sticky bottom-0 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#f4f4f4] via-[#f4f4f4] to-transparent">
        <button
          type="button"
          disabled={!role}
          onClick={() => role && router.push(`/auth/register?role=${role}`)}
          className="w-full h-[52px] rounded-2xl bg-brand-accent text-white font-bold text-[16px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
        >
          Продолжить
          <FiArrowRight size={18} />
        </button>
        <p className="mt-4 text-center text-[14px] text-[#6e6e73]">
          Уже есть аккаунт?{' '}
          <Link href="/auth/login" className="text-brand-accent font-semibold">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}
