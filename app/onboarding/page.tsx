'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/db'

const STEPS: Record<UserRole, Array<{ title: string; desc: string; action: string; href: string }>> = {
  master: [
    {
      title: 'Добавьте фото профиля',
      desc: 'Мастера с фото получают в 3 раза больше откликов',
      action: 'Загрузить фото',
      href: '/settings?open=profile',
    },
    {
      title: 'Выберите специализации',
      desc: 'Укажите чем именно занимаетесь — это влияет на поиск',
      action: 'Добавить специализации',
      href: '/onboarding/specializations',
    },
    {
      title: 'Добавьте примеры работ',
      desc: 'Портфолио с фото повышает доверие клиентов',
      action: 'Открыть профиль',
      href: '/portfolio/new',
    },
  ],
  seller: [
    {
      title: 'Оформите профиль магазина',
      desc: 'Название, описание и логотип увеличивают продажи',
      action: 'Настроить магазин',
      href: '/onboarding/seller',
    },
    {
      title: 'Добавьте первый товар',
      desc: 'Начните продавать прямо сейчас',
      action: 'Добавить товар',
      href: '/products/new',
    },
  ],
  client: [
    {
      title: 'Найдите мастера',
      desc: 'Введите что нужно сделать и выберите специалиста',
      action: 'Найти мастера',
      href: '/search',
    },
    {
      title: 'Создайте заказ',
      desc: 'Опишите задачу и получите отклики от мастеров',
      action: 'Создать заказ',
      href: '/orders/new',
    },
  ],
}

export default function OnboardingPage() {
  const router = useRouter()
  const [role, setRole] = useState<UserRole | null>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/auth/login')
        return
      }
      const metaRole = user.user_metadata?.role as UserRole | undefined
      if (metaRole && STEPS[metaRole]) {
        setRole(metaRole)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      setRole((profile?.role as UserRole) ?? 'client')
    })
  }, [router])

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    )
  }

  const steps = STEPS[role]
  const current = steps[step]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="max-w-sm w-full">
        <div className="flex gap-2 mb-8 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full flex-1 transition-all ${
                i <= step ? 'bg-brand-accent' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-400 mb-1">
            Шаг {step + 1} из {steps.length}
          </p>
          <h2 className="text-xl font-semibold mb-2">{current.title}</h2>
          <p className="text-gray-500 mb-6">{current.desc}</p>

          <Link
            href={current.href}
            className="block w-full text-center bg-brand-accent text-white py-3 rounded-xl font-medium mb-3"
          >
            {current.action}
          </Link>

          <button
            type="button"
            onClick={() => {
              if (step < steps.length - 1) setStep((s) => s + 1)
              else router.push('/feed')
            }}
            className="block w-full text-center text-gray-400 py-2 text-sm"
          >
            {step < steps.length - 1 ? 'Пропустить шаг →' : 'Перейти на платформу →'}
          </button>
        </div>
      </div>
    </div>
  )
}
