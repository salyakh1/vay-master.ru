'use client'

import Link from 'next/link'
import type { Order } from '@/lib/supabase'
import { STATUS_CONFIG, getCategoryIcon, formatOrderDate, pluralResponse } from './order-utils'

type OrderGridCardProps = {
  order: Order
  isClient: boolean
  responseCount?: number
}

export default function OrderGridCard({ order, isClient, responseCount = 0 }: OrderGridCardProps) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.new
  const isNew = order.status === 'open' || order.status === 'new'
  const isDone = order.status === 'completed'

  return (
    <Link
      href={`/orders/${order.id}`}
      className={`block bg-white rounded-2xl p-3 border transition-transform active:scale-[0.97] ${cfg.card}`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[18px] leading-none">{getCategoryIcon(order.category)}</span>
        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${cfg.pill}`}>{cfg.label}</span>
      </div>
      <p className="text-[12px] font-bold text-[#111] leading-tight mb-1.5 line-clamp-2">{order.title}</p>
      {order.budget ? (
        <p className="text-[11px] font-bold text-[#e63946] mb-2">
          до {order.budget.toLocaleString('ru-RU')} ₽
        </p>
      ) : (
        <p className="text-[11px] text-[#bbb] mb-2">Бюджет не указан</p>
      )}
      <div className="border-t border-[#f5f5f7] pt-1.5 flex items-center justify-between gap-1">
        <span className="text-[9px] text-[#bbb]">{formatOrderDate(order.created_at)}</span>
        {isNew && isClient && (
          <span
            className={`text-[9px] font-semibold flex items-center gap-1 ${
              responseCount > 0 ? 'text-[#e63946]' : 'text-[#aaa]'
            }`}
          >
            {responseCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#e63946]" />}
            {responseCount > 0 ? `${responseCount} ${pluralResponse(responseCount)}` : 'Нет откликов'}
          </span>
        )}
        {isDone && isClient && <span className="text-[9px] font-semibold text-[#22a85e]">★ Оценить</span>}
        {!isClient && isNew && (
          <span className="text-[9px] font-semibold text-[#e63946]">Откликнуться →</span>
        )}
      </div>
    </Link>
  )
}
