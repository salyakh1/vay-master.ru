'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export function AdminStatCard({
  icon,
  iconBg,
  value,
  label,
  trend,
  trendVariant = 'flat',
}: {
  icon: ReactNode
  iconBg: string
  value: string | number
  label: string
  trend?: string
  trendVariant?: 'up' | 'down' | 'flat'
}) {
  const trendCls =
    trendVariant === 'up'
      ? 'bg-[#edfff5] text-[#22a85e]'
      : trendVariant === 'down'
        ? 'bg-[#fdf0f0] text-brand-accent'
        : 'bg-[#f2f2f7] text-[#8e8e93]'

  return (
    <div className="bg-white rounded-[14px] border border-[#e5e5ea] p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-base"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        {trend && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${trendCls}`}>{trend}</span>}
      </div>
      <div className="text-2xl font-black text-[#1c1c1e] tracking-tight mb-0.5">{value}</div>
      <div className="text-[11px] text-[#8e8e93] font-medium">{label}</div>
    </div>
  )
}

export function AdminPanel({
  title,
  linkHref,
  linkLabel = 'Все →',
  children,
  hideHeader,
}: {
  title?: string
  linkHref?: string
  linkLabel?: string
  children: ReactNode
  hideHeader?: boolean
}) {
  return (
    <div className="bg-white rounded-[14px] border border-[#e5e5ea] overflow-hidden">
      {!hideHeader && title && (
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e5e5ea]">
          <span className="text-[13px] font-bold text-[#1c1c1e]">{title}</span>
          {linkHref && (
            <Link href={linkHref} className="text-[11px] font-semibold text-brand-accent">
              {linkLabel}
            </Link>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

export function AdminSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[13px] font-bold text-[#1c1c1e] mb-2.5">{children}</h2>
}

export function AdminQuickAction({
  href,
  icon,
  label,
  count,
  onClick,
}: {
  href?: string
  icon: string
  label: string
  count?: string
  onClick?: () => void
}) {
  const cls =
    'bg-white border border-[#e5e5ea] rounded-xl p-3.5 text-center transition-colors hover:border-brand-accent hover:bg-[#fdf0f0] active:scale-[0.98] block w-full'

  const inner = (
    <>
      <div className="text-[22px] mb-1.5">{icon}</div>
      <div className="text-[11px] font-semibold text-[#1c1c1e]">{label}</div>
      {count && <div className="text-[9px] text-brand-accent font-bold mt-0.5">{count}</div>}
    </>
  )

  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

const ROLE_BADGE: Record<string, string> = {
  master: 'bg-[#fdf0f0] text-brand-accent',
  seller: 'bg-[#eaf1fb] text-[#1d5fa6]',
  client: 'bg-[#edfff5] text-[#22a85e]',
}

const ROLE_LABEL: Record<string, string> = {
  master: 'Мастер',
  seller: 'Продавец',
  client: 'Клиент',
}

export function AdminRoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${ROLE_BADGE[role] ?? 'bg-[#f2f2f7] text-[#8e8e93]'}`}>
      {ROLE_LABEL[role] ?? role}
    </span>
  )
}

export function AdminStatusBadge({
  label,
  variant = 'pending',
}: {
  label: string
  variant?: 'pending' | 'active' | 'banned' | 'dispute'
}) {
  const cls =
    variant === 'active'
      ? 'bg-[#edfff5] text-[#22a85e]'
      : variant === 'banned'
        ? 'bg-[#f2f2f7] text-[#8e8e93]'
        : variant === 'dispute'
          ? 'bg-[#fff8e6] text-[#cc8800]'
          : 'bg-[#fff8e6] text-[#cc8800]'

  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${cls}`}>{label}</span>
}

export function AdminAvatar({
  name,
  colorIndex = 0,
  size = 28,
}: {
  name?: string | null
  colorIndex?: number
  size?: number
}) {
  const colors = ['#c0392b', '#1d5fa6', '#22a85e', '#6c3483', '#555', '#8B4513']
  const initials =
    name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '??'

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: colors[colorIndex % colors.length], fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  )
}
