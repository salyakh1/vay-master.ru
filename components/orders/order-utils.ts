import type { Order, OrderStatus } from '@/lib/supabase'

export const CATEGORY_ICONS: Record<string, string> = {
  электрика: '⚡',
  сантехника: '🚿',
  ремонт: '🔧',
  строительство: '🏗️',
  стройка: '🏗️',
  окна: '🪟',
  отделка: '🎨',
  кровля: '🏠',
  ландшафт: '🌿',
  default: '📋',
}

export function getCategoryIcon(category?: string | null): string {
  if (!category) return CATEGORY_ICONS.default
  const key = category.toLowerCase()
  for (const [k, icon] of Object.entries(CATEGORY_ICONS)) {
    if (k !== 'default' && key.includes(k)) return icon
  }
  return CATEGORY_ICONS.default
}

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; pill: string; card: string }
> = {
  open: {
    label: 'Новый',
    pill: 'bg-[#fff1f2] text-[#e63946]',
    card: 'border-[#e63946] bg-[#fff8f8]',
  },
  new: {
    label: 'Новый',
    pill: 'bg-[#fff1f2] text-[#e63946]',
    card: 'border-[#e63946] bg-[#fff8f8]',
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
