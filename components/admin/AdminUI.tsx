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
      ? 'bg-admin-successBg text-admin-success'
      : trendVariant === 'down'
        ? 'bg-admin-soft text-brand-accent'
        : 'bg-admin-bg text-admin-muted'

  return (
    <div className="bg-admin-surface rounded-[14px] border border-admin-border p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center text-base"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        {trend && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${trendCls}`}>{trend}</span>}
      </div>
      <div className="text-2xl font-black text-admin-ink tracking-tight mb-0.5">{value}</div>
      <div className="text-[11px] text-admin-muted font-medium">{label}</div>
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
    <div className="bg-admin-surface rounded-[14px] border border-admin-border overflow-hidden">
      {!hideHeader && title && (
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-admin-border">
          <span className="text-[13px] font-bold text-admin-ink">{title}</span>
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
  return <h2 className="text-[13px] font-bold text-admin-ink mb-2.5">{children}</h2>
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
    'bg-admin-surface border border-admin-border rounded-xl p-3.5 text-center transition-colors hover:border-brand-accent hover:bg-admin-soft active:scale-[0.98] block w-full'

  const inner = (
    <>
      <div className="text-[22px] mb-1.5">{icon}</div>
      <div className="text-[11px] font-semibold text-admin-ink">{label}</div>
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
  master: 'bg-admin-soft text-brand-accent',
  seller: 'bg-admin-infoBg text-admin-info',
  client: 'bg-admin-successBg text-admin-success',
}

const ROLE_LABEL: Record<string, string> = {
  master: 'Мастер',
  seller: 'Продавец',
  client: 'Клиент',
}

export function AdminRoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${ROLE_BADGE[role] ?? 'bg-admin-bg text-admin-muted'}`}>
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
      ? 'bg-admin-successBg text-admin-success'
      : variant === 'banned'
        ? 'bg-admin-bg text-admin-muted'
        : variant === 'dispute'
          ? 'bg-admin-warnBg text-admin-warn'
          : 'bg-admin-warnBg text-admin-warn'

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
      ?.split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: colors[colorIndex % colors.length],
      }}
    >
      {initials}
    </div>
  )
}
