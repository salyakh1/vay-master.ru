'use client'

import Image from 'next/image'
import GuestAwareProfileLink from '@/components/GuestAwareProfileLink'
import type { MasterScrollerItem } from '@/lib/scrollerApi'

const AVATAR_COLORS = ['#c0392b', '#555', '#8B4513', '#1d5fa6', '#22a85e', '#6c3483']

export function MasterListCardSkeleton() {
  return (
    <div className="flex gap-4 bg-white rounded-2xl p-4 border border-[#e5e5ea] animate-pulse min-h-[88px]">
      <div className="w-16 h-16 rounded-full bg-[#f2f2f7] flex-shrink-0" />
      <div className="flex-1 py-0.5">
        <div className="h-4 bg-[#f2f2f7] rounded mb-2.5 w-2/3" />
        <div className="h-3.5 bg-[#f2f2f7] rounded mb-2 w-1/2" />
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
  const reviews = master.master_reviews_count ?? 0
  const isPro = master.is_pro || (master.pro_until && new Date(master.pro_until) > new Date())

  return (
    <GuestAwareProfileLink
      profileId={master.id}
      className="flex gap-4 items-center bg-white rounded-2xl p-4 border border-[#e5e5ea] active:scale-[0.98] transition-transform min-h-[88px] w-full text-left"
    >
      <div className="relative flex-shrink-0">
        {master.avatar_url ? (
          <Image
            src={master.avatar_url}
            alt={master.full_name ?? ''}
            width={64}
            height={64}
            className="rounded-full object-cover w-16 h-16"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-base"
            style={{ background: color }}
          >
            {initials}
          </div>
        )}
        {isPro && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-brand-accent border-2 border-white text-white text-[8px] font-extrabold px-1 py-0.5 rounded-[3px]">
            PRO
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="text-[15px] font-bold text-[#1c1c1e] truncate">{master.full_name}</span>
        </div>
        <p className="text-[12px] text-[#8e8e93] mb-1.5 truncate">{specs}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-0.5 bg-[#fff8e6] px-2 py-1 rounded-md">
            <span className="text-[#f4a228] text-[12px] leading-none">★</span>
            <span className="text-[12px] font-bold text-[#1c1c1e]">
              {rating > 0 ? rating.toFixed(1) : '—'}
            </span>
            {reviews > 0 && (
              <span className="text-[11px] text-[#8e8e93] font-medium">({reviews})</span>
            )}
          </div>
          {master.city && (
            <span className="bg-[#f2f2f7] text-[#666] text-[10px] font-medium px-2 py-1 rounded-md truncate max-w-[110px]">
              {master.city}
            </span>
          )}
          {master.distance_km != null && (
            <span className="text-[11px] font-semibold text-brand-accent ml-auto whitespace-nowrap">
              {master.distance_km} км от вас
            </span>
          )}
        </div>
      </div>
    </GuestAwareProfileLink>
  )
}
