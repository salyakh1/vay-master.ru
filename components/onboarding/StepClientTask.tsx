'use client'

import { useState } from 'react'
import { FiSearch, FiPlusCircle } from 'react-icons/fi'
import { hapticTap } from '@/lib/nativeApp'
import OnboardingShell, { OnbPrimaryButton, OnbSkipButton } from './OnboardingShell'
import type { OnboardingStepProps } from './types'

const QUICK_TASKS = ['Сантехник', 'Электрик', 'Кровля', 'Сварка', 'Отделка', 'Спецтехника', 'Ремонт авто', 'Плитка']

export default function StepClientTask({ index, total, onBack, onFinish }: OnboardingStepProps) {
  const [task, setTask] = useState('')
  const trimmed = task.trim()

  return (
    <OnboardingShell
      total={total}
      current={index}
      stepKey="task"
      onBack={onBack}
      title="Что нужно сделать?"
      subtitle="Напишите своими словами — подберём мастеров рядом."
      footer={
        <>
          <OnbPrimaryButton
            onClick={() => onFinish(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search')}
          >
            <FiSearch size={18} />
            {trimmed ? 'Найти мастера' : 'Смотреть мастеров рядом'}
          </OnbPrimaryButton>
          <OnbSkipButton onClick={() => onFinish('/feed')}>Просто посмотреть ленту</OnbSkipButton>
        </>
      }
    >
      <div className="relative">
        <FiSearch className="absolute left-4 top-4 text-[#8e8e93]" size={18} />
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={3}
          maxLength={200}
          placeholder="Например: течёт крыша в гараже"
          className="w-full rounded-2xl bg-white border border-[#e5e5ea] pl-11 pr-4 py-3.5 text-[15px] leading-snug outline-none resize-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10"
        />
      </div>

      <p className="mt-5 mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#8e8e93]">Частые задачи</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_TASKS.map((t) => {
          const on = trimmed === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                hapticTap()
                setTask(on ? '' : t)
              }}
              aria-pressed={on}
              className={[
                'rounded-full border-2 px-3.5 py-2 text-[14px] font-semibold transition-all active:scale-95',
                on ? 'border-brand-accent bg-[#fdf2f1] text-brand-accent' : 'border-[#e5e5ea] bg-white text-[#1c1c1e]',
              ].join(' ')}
            >
              {t}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onFinish('/orders/new')}
        className="mt-6 w-full rounded-2xl bg-white p-4 shadow-sm flex items-center gap-3 text-left active:scale-[0.99]"
      >
        <span className="w-11 h-11 rounded-xl bg-[#fdf2f1] text-brand-accent flex items-center justify-center shrink-0">
          <FiPlusCircle size={20} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold text-[#1c1c1e]">Опубликовать заказ</span>
          <span className="block text-[13px] text-[#6e6e73]">Мастера сами предложат цену</span>
        </span>
      </button>
    </OnboardingShell>
  )
}
