'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

type HorizontalScrollerProps = {
  children: ReactNode
  loadMoreHref?: string
  loadMoreLabel?: string
  loadMoreCount?: number
  onLoadMore?: () => void
  className?: string
}

export function ScrollerSectionHeader({
  tag,
  tagVariant = 'blue',
  title,
  meta,
  linkHref,
  linkLabel,
}: {
  tag: string
  tagVariant?: 'blue' | 'green' | 'red'
  title: string
  meta?: string
  linkHref?: string
  linkLabel?: string
}) {
  const tagCls =
    tagVariant === 'green'
      ? 'bg-[#edfff5] text-[#22a85e]'
      : tagVariant === 'red'
        ? 'bg-[#fdf0f0] text-brand-accent'
        : 'bg-[#eaf1fb] text-[#1d5fa6]'

  return (
    <div className="flex items-end justify-between px-3.5 pt-3 pb-1.5">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={`text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-lg w-fit ${tagCls}`}>
          {tag}
        </span>
        <span className="text-[15px] font-bold text-[#1c1c1e] leading-tight">{title}</span>
        {meta && <span className="text-[10px] text-[#8e8e93]">{meta}</span>}
      </div>
      {linkHref && linkLabel && (
        <Link href={linkHref} className="text-xs font-semibold text-brand-accent whitespace-nowrap ml-2 shrink-0">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

export function ScrollerRadiusRow({ radiusKm, city }: { radiusKm: number; city?: string | null }) {
  return (
    <div className="flex items-center gap-1.5 mx-3.5 mb-1.5 bg-white border border-[#e5e5ea] rounded-full px-2.5 py-1 w-fit">
      <span className="text-xs" aria-hidden>
        📍
      </span>
      <span className="text-[10px] text-[#8e8e93] font-medium">
        Радиус: <span className="text-brand-accent font-bold">{radiusKm} км</span>
        {city ? ` · ${city}` : ''}
      </span>
    </div>
  )
}

export default function HorizontalScroller({
  children,
  loadMoreHref,
  loadMoreLabel = 'Ещё',
  loadMoreCount,
  onLoadMore,
  className = '',
}: HorizontalScrollerProps) {
  const loadMoreTile = (
    <div className="flex-shrink-0 w-[100px] rounded-2xl border-[1.5px] border-dashed border-[#c7c7cc] bg-[#f2f2f7] flex flex-col items-center justify-center gap-1.5 scroll-snap-align-end py-3 px-1.5">
      <div className="w-[30px] h-[30px] rounded-full bg-brand-accent flex items-center justify-center text-white text-base font-bold">
        ›
      </div>
      <div className="text-[10px] text-[#8e8e93] text-center leading-snug">{loadMoreLabel}</div>
      {loadMoreCount != null && loadMoreCount > 0 && (
        <div className="text-[9px] font-bold text-brand-accent">+{loadMoreCount}</div>
      )}
    </div>
  )

  return (
    <div
      className={`flex gap-2.5 overflow-x-auto px-3.5 pb-3 snap-x snap-mandatory scrollbar-hide ${className}`}
    >
      {children}
      {loadMoreHref ? (
        <Link href={loadMoreHref} className="flex-shrink-0 scroll-snap-align-end">
          {loadMoreTile}
        </Link>
      ) : onLoadMore ? (
        <button type="button" onClick={onLoadMore} className="flex-shrink-0 scroll-snap-align-end">
          {loadMoreTile}
        </button>
      ) : null}
    </div>
  )
}
