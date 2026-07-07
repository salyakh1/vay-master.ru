'use client'

import Image from 'next/image'
import GuestAwareProfileLink from '@/components/GuestAwareProfileLink'
import type { User } from '@/lib/supabase'

function getSpecs(master: User): string {
  const fromSubs = Array.isArray(
    (master as User & { profile_subcategories?: Array<{ subcategory?: { name?: string } }> }).profile_subcategories
  )
    ? (master as User & { profile_subcategories: Array<{ subcategory?: { name?: string } }> }).profile_subcategories
        .map((item) => item.subcategory?.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(' · ')
    : ''
  return fromSubs || master.specialization || 'Мастер'
}

const AVATAR_BG = ['#c0392b', '#555555', '#8B4513', '#22a85e', '#1d3557', '#6a4c93']

function avatarBg(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_BG.length
  return AVATAR_BG[h]
}

type MasterScrollerCardProps = {
  master: User & { distance_km?: number }
}

export default function MasterScrollerCard({ master }: MasterScrollerCardProps) {
  const initials =
    master.full_name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  const rating = master.master_rating ?? 0
  const reviews = master.master_reviews_count ?? 0
  const isPro = master.is_pro || (master.pro_until && new Date(master.pro_until) > new Date())

  return (
    <GuestAwareProfileLink
      profileId={master.id}
      className="flex-shrink-0 w-[144px] bg-white rounded-2xl p-[11px] border border-[#e5e5ea] scroll-snap-align-start active:scale-[0.98] transition-transform block"
    >
      <div className="mb-1.5">
        <div
          className="relative w-[42px] h-[42px] rounded-full flex items-center justify-center text-white text-[13px] font-bold overflow-hidden"
          style={{ backgroundColor: master.avatar_url ? undefined : avatarBg(master.id) }}
        >
          {master.avatar_url ? (
            <Image src={master.avatar_url} alt="" width={42} height={42} className="object-cover w-full h-full" />
          ) : (
            initials
          )}
          {isPro && (
            <span className="absolute -bottom-0.5 -right-0.5 bg-brand-accent border-2 border-white text-white text-[7px] font-extrabold px-1 rounded-sm">
              PRO
            </span>
          )}
        </div>
      </div>
      <p className="text-xs font-bold text-[#1c1c1e] mb-0.5 truncate">{master.full_name}</p>
      <p className="text-[10px] text-[#8e8e93] leading-snug line-clamp-2 min-h-[26px] mb-1">{getSpecs(master)}</p>
      <div className="flex items-center justify-between gap-1">
        <div className="inline-flex items-center gap-0.5 bg-[#fff8e6] px-1 py-0.5 rounded-md text-[10px]">
          <span className="text-[#f4a228] leading-none">★</span>
          <span className="text-[#1c1c1e] font-bold">{rating > 0 ? rating.toFixed(1) : '—'}</span>
          {reviews > 0 && <span className="text-[#8e8e93] font-medium">({reviews})</span>}
        </div>
        {master.distance_km != null ? (
          <span className="text-[9px] font-semibold text-brand-accent whitespace-nowrap">{master.distance_km} км</span>
        ) : master.city ? (
          <span className="text-[9px] text-[#c7c7cc] truncate max-w-[52px]">{master.city}</span>
        ) : null}
      </div>
    </GuestAwareProfileLink>
  )
}
