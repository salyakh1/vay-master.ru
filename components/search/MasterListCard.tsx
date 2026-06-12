'use client'

import Image from 'next/image'
import GuestAwareProfileLink from '@/components/GuestAwareProfileLink'
import type { MasterScrollerItem } from '@/lib/scrollerApi'

const AVATAR_COLORS = ['#c0392b', '#555', '#8B4513', '#1d5fa6', '#22a85e', '#6c3483']

export function MasterListCardSkeleton() {
  return (
    <div className="flex gap-3 bg-white rounded-2xl p-3 border border-[#e5e5ea] animate-pulse">
      <div className="w-[50px] h-[50px] rounded-full bg-[#f2f2f7] flex-shrink-0" />
      <div className="flex-1">
        <div className="h-3.5 bg-[#f2f2f7] rounded mb-2 w-2/3" />
        <div className="h-3 bg-[#f2f2f7] rounded mb-2 w-1/2" />
        <div className="h-3 bg-[#f2f2f7] rounded w-1/3" />
      </div>
    </div>
  )
}

export function MasterListCard({
  master,
  colorIndex = 0,
}: {
  master: MasterScrollerItem
  colorIndex?: number
}) {
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  const initials =
    master.full_name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '??'

  const specs = Array.isArray(master.profile_subcategories)
    ? master.profile_subcategories
        .map((item: { subcategory?: { name?: string } }) => item.subcategory?.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(' · ')
    : master.specialization || master.description?.slice(0, 40) || 'Мастер'

  const rating = master.master_rating ?? 0
  const isPro = master.is_pro || (master.pro_until && new Date(master.pro_until) > new Date())

  return (
    <GuestAwareProfileLink
      profileId={master.id}
      className="flex gap-3 items-center bg-white rounded-2xl p-3 border border-[#e5e5ea] active:scale-[0.98] transition-transform"
    >
      <div className="relative flex-shrink-0">
        {master.avatar_url ? (
          <Image
            src={master.avatar_url}
            alt={master.full_name ?? ''}
            width={50}
            height={50}
            className="rounded-full object-cover w-[50px] h-[50px]"
          />
        ) : (
          <div
            className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: color }}
          >
            {initials}
          </div>
        )}
        {isPro && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-brand-accent border-2 border-white text-white text-[7px] font-extrabold px-1 py-0.5 rounded-[3px]">
            PRO
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5 gap-2">
          <span className="text-[13px] font-bold text-[#1c1c1e] truncate">{master.full_name}</span>
        </div>
        <p className="text-[11px] text-[#8e8e93] mb-1 truncate">{specs}</p>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <span className="text-yellow-400 text-[10px]">★</span>
            <span className="text-[10px] font-bold text-[#1c1c1e]">
              {rating > 0 ? rating.toFixed(1) : '—'}
            </span>
          </div>
          {master.city && (
            <span className="bg-[#f2f2f7] text-[#666] text-[9px] font-medium px-2 py-0.5 rounded-md truncate max-w-[90px]">
              {master.city}
            </span>
          )}
          {master.distance_km != null && (
            <span className="text-[9px] text-[#c7c7cc] ml-auto">{master.distance_km} км</span>
          )}
        </div>
      </div>
    </GuestAwareProfileLink>
  )
}
