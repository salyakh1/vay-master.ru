'use client'

import type { ReactNode } from 'react'
import { FiChevronLeft } from 'react-icons/fi'

type OnboardingShellProps = {
  total: number
  current: number
  stepKey: string
  onBack?: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer: ReactNode
}

export default function OnboardingShell({
  total,
  current,
  stepKey,
  onBack,
  title,
  subtitle,
  children,
  footer,
}: OnboardingShellProps) {
  return (
    <div className="min-h-[100dvh] bg-[#f4f4f4] flex flex-col max-w-lg mx-auto w-full">
      <header className="sticky top-0 z-20 bg-[#f4f4f4]/95 backdrop-blur px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={!onBack}
            aria-label="Назад"
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-[#1c1c1e] active:bg-black/5 disabled:opacity-0 transition-opacity"
          >
            <FiChevronLeft size={24} />
          </button>
          <div className="flex-1 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className="h-1 flex-1 rounded-full bg-[#e0e0e5] overflow-hidden">
                <span
                  className="block h-full bg-brand-accent rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: i <= current ? '100%' : '0%' }}
                />
              </span>
            ))}
          </div>
          <span className="w-10 text-right text-[12px] font-semibold text-[#8e8e93] tabular-nums">
            {current + 1}/{total}
          </span>
        </div>
      </header>

      <main key={stepKey} className="onb-step-enter flex-1 px-5 pb-6">
        <h1 className="font-display text-[24px] leading-tight font-extrabold text-[#1c1c1e] mt-2 mb-1.5">{title}</h1>
        {subtitle && <p className="text-[14px] text-[#6e6e73] leading-snug mb-5">{subtitle}</p>}
        {children}
      </main>

      <footer className="sticky bottom-0 z-20 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#f4f4f4] via-[#f4f4f4] to-[#f4f4f4]/0">
        {footer}
      </footer>
    </div>
  )
}

type PrimaryButtonProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  tone?: 'accent' | 'success'
}

export function OnbPrimaryButton({ children, onClick, disabled, loading, tone = 'accent' }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'w-full h-[52px] rounded-2xl text-white font-bold text-[16px] flex items-center justify-center gap-2',
        'transition-all active:scale-[0.98] disabled:opacity-40 shadow-[0_8px_24px_rgba(0,0,0,0.08)]',
        tone === 'success' ? 'bg-[#1f9d55]' : 'bg-brand-accent',
      ].join(' ')}
    >
      {loading ? (
        <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-label="Загрузка" />
      ) : (
        children
      )}
    </button>
  )
}

export function OnbSkipButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full mt-2 py-2.5 text-[14px] font-medium text-[#8e8e93] active:text-[#1c1c1e]"
    >
      {children}
    </button>
  )
}

export function OnbError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div role="alert" className="mb-3 rounded-xl bg-[#fdf0f0] border border-[#f5c6cb] text-brand-accent px-3 py-2.5 text-[13px]">
      {message}
    </div>
  )
}
