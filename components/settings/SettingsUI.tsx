'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'

export function SettingsHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-white border-b border-[#e5e5ea] px-4 pt-2.5 pb-3 flex-shrink-0">
      <div className="flex items-center gap-2.5 mb-3">
        <button
          type="button"
          onClick={onBack}
          className="w-[30px] h-[30px] rounded-lg bg-[#f2f2f7] flex items-center justify-center text-brand-accent text-[15px]"
          aria-label="Назад"
        >
          ←
        </button>
        <h1 className="text-[17px] font-bold text-[#1c1c1e] flex-1">Настройки</h1>
      </div>
    </div>
  )
}

type ProfilePreviewProps = {
  name: string
  roleLabel: string
  city?: string
  avatarUrl?: string
  initials: string
  avatarBg: string
  isPro?: boolean
  profileHref: string
}

export function SettingsProfilePreview({
  name,
  roleLabel,
  city,
  avatarUrl,
  initials,
  avatarBg,
  isPro,
  profileHref,
}: ProfilePreviewProps) {
  return (
    <div className="flex items-center gap-3 bg-[#f9f9fb] rounded-[14px] p-3 border border-[#e5e5ea]">
      <div
        className="relative w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0 overflow-hidden"
        style={{ backgroundColor: avatarBg }}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={52} height={52} className="object-cover w-full h-full" />
        ) : (
          initials
        )}
        {isPro && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-brand-accent border-2 border-[#f9f9fb] text-white text-[7px] font-extrabold px-1 rounded-[4px]">
            PRO
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#1c1c1e] truncate mb-0.5">{name}</p>
        <p className="text-[10px] text-[#8e8e93]">
          {roleLabel}
          {city ? ` · ${city}` : ''}
        </p>
      </div>
      <Link href={profileHref} className="text-[11px] font-semibold text-brand-accent flex-shrink-0">
        Профиль →
      </Link>
    </div>
  )
}

export function SettingsProBanner({
  tag,
  title,
  subtitle,
  buttonLabel,
  href,
}: {
  tag: string
  title: string
  subtitle: string
  buttonLabel: string
  href: string
}) {
  return (
    <div className="mx-3 mt-3 bg-gradient-to-br from-[#1c1c1e] to-brand-accent rounded-[14px] p-3.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[8px] font-bold text-white/60 uppercase tracking-wide mb-1">{tag}</p>
        <p className="text-sm font-bold text-white mb-0.5">{title}</p>
        <p className="text-[10px] text-white/60">{subtitle}</p>
      </div>
      <Link
        href={href}
        className="bg-white text-brand-accent text-[10px] font-bold px-3.5 py-2 rounded-lg flex-shrink-0"
      >
        {buttonLabel}
      </Link>
    </div>
  )
}

export function SettingsSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mx-3 mt-3">
      {title && (
        <p className="text-[10px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-1.5 px-0.5">
          {title}
        </p>
      )}
      <div className="bg-white rounded-[14px] border border-[#e5e5ea] overflow-hidden">{children}</div>
    </div>
  )
}

type SettingsRowProps = {
  icon: ReactNode
  iconBg?: string
  title: string
  subtitle?: string
  right?: ReactNode
  href?: string
  onClick?: () => void
  danger?: boolean
}

export function SettingsRow({
  icon,
  iconBg = '#f0f0f5',
  title,
  subtitle,
  right,
  href,
  onClick,
  danger,
}: SettingsRowProps) {
  const inner = (
    <>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] flex-shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium ${danger ? 'text-brand-accent' : 'text-[#1c1c1e]'}`}>{title}</p>
        {subtitle && <p className="text-[10px] text-[#8e8e93] mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-1.5 flex-shrink-0">{right}</div>}
    </>
  )

  const className =
    'flex items-center gap-3 px-3.5 py-3 border-b border-[#f2f2f7] last:border-b-0 w-full text-left transition-colors active:bg-[#fafafa]'

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    )
  }

  return <div className={className}>{inner}</div>
}

export function SettingsToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-[38px] h-[22px] rounded-[11px] relative flex-shrink-0 transition-colors ${
        checked ? 'bg-brand-accent' : 'bg-[#e5e5ea]'
      }`}
    >
      <span
        className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export function SettingsArrow() {
  return <span className="text-[#c7c7cc] text-sm">›</span>
}

export function SettingsBadge({
  children,
  variant = 'red',
}: {
  children: ReactNode
  variant?: 'red' | 'green' | 'gray'
}) {
  const cls =
    variant === 'green'
      ? 'bg-[#22a85e]'
      : variant === 'gray'
        ? 'bg-[#8e8e93]'
        : 'bg-brand-accent'
  return (
    <span className={`${cls} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-lg`}>{children}</span>
  )
}

type SettingsAccordionItemProps = {
  icon: ReactNode
  iconBg?: string
  title: string
  subtitle?: string
  expanded: boolean
  onToggle: () => void
  children?: ReactNode
  right?: ReactNode
  danger?: boolean
}

export function SettingsAccordionItem({
  icon,
  iconBg = '#f0f0f5',
  title,
  subtitle,
  expanded,
  onToggle,
  children,
  right,
  danger,
}: SettingsAccordionItemProps) {
  return (
    <div className="border-b border-[#f2f2f7] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-3 px-3.5 py-3 w-full text-left transition-colors active:bg-[#fafafa]"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px] flex-shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium ${danger ? 'text-brand-accent' : 'text-[#1c1c1e]'}`}>{title}</p>
          {subtitle && <p className="text-[10px] text-[#8e8e93] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {right}
          <span
            className={`text-[#c7c7cc] text-sm transition-transform ${expanded ? 'rotate-90' : ''}`}
            aria-hidden
          >
            ›
          </span>
        </div>
      </button>
      {expanded && children && (
        <div className="px-3.5 pb-3.5 pt-0 border-t border-[#f2f2f7] bg-[#fafafa]/80">{children}</div>
      )}
    </div>
  )
}
