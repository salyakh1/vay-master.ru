'use client'

import Image from 'next/image'
import GuestAwareProfileLink from '@/components/GuestAwareProfileLink'
import type { MasterScrollerItem } from '@/lib/scrollerApi'
import { getInitials, getMasterAvatarAlt, getMasterSpecs } from '@/lib/master-display'
import { pickMatchedServicePrice } from '@/lib/service-price'
import { isProActive } from '@/lib/masterAccess'
import { trackFunnel } from '@/lib/track-funnel'

const AVATAR_COLORS = ['#c0392b', '#555', '#8B4513', '#1d5fa6', '#22a85e', '#6c3483']

export function MasterListCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] p-3 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-[#f2f2f7] mb-2" />
      <div className="h-3.5 bg-[#f2f2f7] rounded mb-1.5 w-4/5" />
      <div className="flex gap-1.5 mb-1.5">
        <div className="h-5 w-10 bg-[#f2f2f7] rounded-md" />
        <div className="h-5 w-14 bg-[#f2f2f7] rounded-md" />
      </div>
      <div className="h-3 bg-[#f2f2f7] rounded w-full mb-1.5" />
      <div className="h-3 bg-[#f2f2f7] rounded w-2/3" />
    </div>
  )
}

export function MasterListCard({
  master,
  colorIndex = 0,
  matchedServiceIds,
  searchQuery,
}: {
  master: MasterScrollerItem
  colorIndex?: number
  matchedServiceIds?: string[]
  searchQuery?: string
}) {
  const color = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  const initials = getInitials(master.full_name, '??')
  const specs = getMasterSpecs(master)
  const rating = master.master_rating ?? 0
  const isPro = isProActive(master)
  const matchedPrice = pickMatchedServicePrice(master.profile_services, {
    serviceIds: matchedServiceIds,
    q: searchQuery,
  })

  return (
    <GuestAwareProfileLink
      profileId={master.id}
      className="block bg-white rounded-2xl border border-[#e5e5ea] p-3 h-full active:scale-[0.98] transition-transform text-left"
      onClick={() => {
        void trackFunnel('click_master', { masterId: master.id })
      }}
    >
      <div className="relative w-12 h-12 mb-2 flex-shrink-0">
        {master.avatar_url ? (
          <Image
            src={master.avatar_url}
            alt={getMasterAvatarAlt(master.full_name)}
            width={48}
            height={48}
            className="rounded-full object-cover w-12 h-12"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-[15px]"
            style={{ background: color }}
          >
            {initials}
          </div>
        )}
        {isPro && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-brand-accent border-2 border-white text-white text-[7px] font-bold px-1 py-0.5 rounded-[3px]">
            PRO
          </span>
        )}
      </div>

      <p className="text-[13px] font-medium text-[#1c1c1e] mb-1 truncate">{master.full_name}</p>

      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span className="inline-flex items-center gap-0.5 bg-[#fff8e6] px-1.5 py-0.5 rounded-md">
          <span className="text-[#f4a228] text-[11px] leading-none">★</span>
          <span className="text-[11px] font-medium text-[#1c1c1e]">
            {rating > 0 ? rating.toFixed(1) : '—'}
          </span>
        </span>
        {master.city && (
          <span className="bg-[#f2f2f7] text-[#666] text-[9px] font-medium px-2 py-0.5 rounded-md truncate max-w-full">
            {master.city}
          </span>
        )}
      </div>

      {matchedPrice && (
        <p className="text-[12px] font-medium text-[#111111] tabular-nums mb-1">{matchedPrice.label}</p>
      )}

      <p className="text-[11px] text-[#8e8e93] leading-snug line-clamp-2 mb-0">
        {matchedPrice?.serviceName || specs}
        {master.distance_km != null && (
          <span className="block text-brand-accent font-medium mt-0.5">{master.distance_km} км от вас</span>
        )}
      </p>
    </GuestAwareProfileLink>
  )
}
