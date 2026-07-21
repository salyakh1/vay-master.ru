'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { OrderResponse } from '@/lib/supabase'
import { formatOrderDate } from './order-utils'

type OrderResponseCardProps = {
  response: OrderResponse
  orderId: string
  canAct: boolean
  onAccept: () => void
  onReject?: () => void
}

export default function OrderResponseCard({
  response,
  orderId,
  canAct,
  onAccept,
}: OrderResponseCardProps) {
  const master = response.master
  const initials =
    master?.full_name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  const pricePart =
    response.price != null ? `Предложил ${response.price.toLocaleString('ru-RU')} ₽` : 'Без цены'
  const when = response.created_at ? formatOrderDate(response.created_at) : ''

  return (
    <div className="bg-white rounded-[14px] p-3 flex items-center gap-2.5 mb-2">
      <Link href={`/profile/${response.master_id}?returnTo=/orders/${orderId}`} className="flex-shrink-0">
        {master?.avatar_url ? (
          <Image
            src={master.avatar_url}
            alt=""
            width={36}
            height={36}
            className="rounded-full object-cover w-9 h-9"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-accent flex items-center justify-center text-white text-[13px] font-medium">
            {initials}
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-[#111] truncate">{master?.full_name || 'Мастер'}</p>
        <p className="text-[10px] text-[#9ca3af] mt-0.5 truncate">
          {pricePart}
          {when ? ` · ${when}` : ''}
        </p>
      </div>
      {response.status === 'pending' && canAct && (
        <button
          type="button"
          onClick={onAccept}
          className="flex-shrink-0 bg-brand-accent text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg"
        >
          Принять
        </button>
      )}
      {response.status === 'accepted' && (
        <span className="flex-shrink-0 text-[10px] font-medium text-[#22a85e]">Выбран</span>
      )}
    </div>
  )
}
