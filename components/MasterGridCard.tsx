'use client'

import Image from 'next/image'
import { FiMapPin, FiStar } from 'react-icons/fi'
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

export default function MasterGridCard({ master }: { master: User }) {
  const initials =
    master.full_name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  const rating = master.master_rating ?? 0
  const reviews = master.master_reviews_count ?? 0

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#f0f0f0] h-full transition-transform active:scale-[0.97]">
      <div className="relative aspect-square w-full bg-[#f5f5f7]">
        {master.avatar_url ? (
          <Image src={master.avatar_url} alt={master.full_name} fill className="object-cover" sizes="50vw" />
        ) : (
          <div className="absolute inset-0 bg-brand-accent flex items-center justify-center text-white text-2xl font-bold">
            {initials}
          </div>
        )}
        {master.is_pro && (
          <span className="absolute top-1.5 right-1.5 bg-brand-accent text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm">
            PRO
          </span>
        )}
      </div>
      <div className="p-2.5 pt-2">
        <p className="text-[12px] font-bold text-[#111] leading-tight mb-0.5 line-clamp-1">{master.full_name}</p>
        <p className="text-[10px] text-[#888] mb-1.5 line-clamp-2 leading-snug min-h-[2.5em]">{getSpecs(master)}</p>
        <div className="border-t border-[#f5f5f7] pt-1.5 flex items-center justify-between gap-1">
          <span className="text-[10px] text-[#111] font-semibold flex items-center gap-0.5">
            <FiStar className="text-amber-400 fill-amber-400 shrink-0" size={9} />
            {rating > 0 ? rating.toFixed(1) : '—'}
            {reviews > 0 && <span className="text-[#aaa] font-normal">({reviews})</span>}
          </span>
          {master.city && (
            <span className="text-[9px] text-[#bbb] truncate max-w-[55%] flex items-center gap-0.5">
              <FiMapPin size={8} className="text-brand-accent/70 shrink-0" />
              {master.city}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
