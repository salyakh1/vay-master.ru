'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { OrderResponse } from '@/lib/supabase'

type OrderResponseCardProps = {
  response: OrderResponse
  orderId: string
  canAct: boolean
  onAccept: () => void
  onReject: () => void
}

export default function OrderResponseCard({
  response,
  orderId,
  canAct,
  onAccept,
  onReject,
}: OrderResponseCardProps) {
  const master = response.master
  const initials =
    master?.full_name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  const borderClass =
    response.status === 'pending'
      ? 'border-[#e63946] bg-[#fff8f8]'
      : response.status === 'accepted'
        ? 'border-[#22a85e] bg-[#f8fff8]'
        : 'border-[#f0f0f0] opacity-60'

  return (
    <div className={`bg-white rounded-2xl p-3 border ${borderClass}`}>
      <div className="flex gap-3">
        <div className="relative flex-shrink-0">
          {master?.avatar_url ? (
            <Image
              src={master.avatar_url}
              alt=""
              width={44}
              height={44}
              className="rounded-full object-cover w-11 h-11"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#e63946] flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          )}
          {master?.is_pro && (
            <span className="absolute -bottom-0.5 -right-0.5 bg-[#e63946] border-2 border-white text-white text-[7px] font-extrabold px-1 py-0.5 rounded-md">
              PRO
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1 gap-2">
            <p className="text-[12px] font-bold text-[#111] truncate">{master?.full_name || 'Мастер'}</p>
            {response.price != null && (
              <p className="text-[12px] font-bold text-[#e63946] flex-shrink-0">
                {response.price.toLocaleString('ru-RU')} ₽
              </p>
            )}
          </div>
          {master?.master_rating != null && (master.master_reviews_count ?? 0) > 0 && (
            <div className="flex items-center gap-1 mb-2 text-[10px]">
              <span className="text-[#f4a228]">★★★★★</span>
              <span className="font-semibold text-[#111]">{master.master_rating.toFixed(1)}</span>
              <span className="text-[#bbb]">({master.master_reviews_count} отзывов)</span>
            </div>
          )}
          <p className="text-[10px] text-[#888] leading-relaxed mb-3 line-clamp-3">{response.message}</p>
          {response.status === 'pending' && canAct && (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={onAccept}
                className="bg-[#e63946] text-white text-[10px] font-bold px-3 py-2 rounded-xl"
              >
                ✓ Принять
              </button>
              <button
                type="button"
                onClick={onReject}
                className="bg-[#f5f5f7] text-[#888] text-[10px] font-semibold px-3 py-2 rounded-xl"
              >
                ✕ Отклонить
              </button>
              <Link
                href={`/profile/${response.master_id}?returnTo=/orders/${orderId}`}
                className="ml-auto bg-[#f5f5f7] text-[#555] text-[10px] font-semibold px-3 py-2 rounded-xl"
              >
                Профиль
              </Link>
            </div>
          )}
          {response.status === 'accepted' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#22a85e]">
              ✓ Выбран исполнитель
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
