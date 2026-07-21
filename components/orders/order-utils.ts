import type { Order, OrderStatus } from '@/lib/supabase'
import { getCategoryEmoji } from '@/lib/categoryEmoji'

export function getCategoryIcon(category?: string | null): string {
  return getCategoryEmoji(null, category)
}

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; pill: string; card: string }
> = {
  open: {
    label: 'Открыт',
    pill: 'bg-[#E6F1FB] text-[#0C447C]',
    card: 'border-[#c5daf0] bg-[#f5f9fd]',
  },
  new: {
    label: 'Открыт',
    pill: 'bg-[#E6F1FB] text-[#0C447C]',
    card: 'border-[#c5daf0] bg-[#f5f9fd]',
  },
  in_progress: {
    label: 'В работе',
    pill: 'bg-[#fff8e6] text-[#cc8800]',
    card: 'border-[#f4a228] bg-[#fffaf0]',
  },
  completed: {
    label: 'Готово',
    pill: 'bg-[#edfff5] text-[#22a85e]',
    card: 'border-[#d0ead0] bg-[#f8fff8]',
  },
  cancelled: {
    label: 'Отменён',
    pill: 'bg-[#f5f5f7] text-[#aaa]',
    card: 'border-[#f0f0f0]',
  },
}

export function formatOrderDate(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'Только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return 'Сегодня'
  if (diff < 172800) return 'Вчера'
  return `${Math.floor(diff / 86400)} дня назад`
}

export function pluralResponse(n: number): string {
  if (n === 1) return 'отклик'
  if (n < 5) return 'отклика'
  return 'откликов'
}

export function countByStatus(orders: Order[]) {
  return {
    new: orders.filter((o) => o.status === 'open' || o.status === 'new').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }
}
