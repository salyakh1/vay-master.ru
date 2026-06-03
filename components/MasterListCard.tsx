'use client'

import Image from 'next/image'
import { FiMapPin } from 'react-icons/fi'
import type { User } from '@/lib/supabase'

function starString(rating: number): string {
  const full = Math.round(rating)
  return '★'.repeat(Math.min(5, full)) + '☆'.repeat(Math.max(0, 5 - full))
}

export default function MasterListCard({ master }: { master: User }) {
  const initials =
    master.full_name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  const specs = Array.isArray((master as User & { profile_subcategories?: Array<{ subcategory?: { name?: string } }> }).profile_subcategories)
    ? (master as User & { profile_subcategories: Array<{ subcategory?: { name?: string } }> }).profile_subcategories
        .map((item) => item.subcategory?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(' · ')
    : master.specialization || ''

  const rating = master.master_rating ?? 0
  const reviews = master.master_reviews_count ?? 0

  return (
    <div className="bg-white rounded-2xl p-3 border border-[#f0f0f0] flex gap-2.5">
      <div className="relative w-[52px] h-[52px] rounded-full bg-brand-accent flex-shrink-0 flex items-center justify-center text-white text-base font-bold overflow-hidden">
        {master.avatar_url ? (
          <Image src={master.avatar_url} alt="" width={52} height={52} className="object-cover w-full h-full" />
        ) : (
          initials
        )}
        {master.is_pro && (
          <span className="absolute -bottom-0.5 -right-0.5 bg-brand-accent border-2 border-white text-white text-[7px] font-extrabold px-1 rounded-[5px]">
            PRO
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-[13px] font-bold text-[#111] truncate">{master.full_name}</p>
        </div>
        {specs && <p className="text-[11px] text-[#aaa] mb-1.5 truncate">{specs}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          {reviews > 0 && rating > 0 ? (
            <span className="text-[10px] text-[#f4a228] flex items-center gap-0.5">
              {starString(rating)}
              <span className="text-[#111] font-semibold ml-0.5">{rating.toFixed(1)}</span>
            </span>
          ) : (
            <span className="text-[10px] text-[#bbb]">Без отзывов</span>
          )}
          {master.city && (
            <span className="bg-[#f5f5f7] rounded-md px-1.5 py-0.5 text-[9px] text-[#666] truncate max-w-[80px]">
              {master.city}
            </span>
          )}
          {master.city && (
            <span className="text-[10px] text-[#bbb] ml-auto flex items-center gap-0.5">
              <FiMapPin size={9} className="text-brand-accent/70" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
