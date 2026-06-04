import { format, isToday, isYesterday, differenceInHours, differenceInDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { UserRole } from '@/types/db'

export const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  master: { label: 'Мастер', className: 'bg-[#fff1f2] text-[#e63946]' },
  seller: { label: 'Продавец', className: 'bg-[#e6f1fb] text-[#185fa5]' },
  client: { label: 'Клиент', className: 'bg-[#eaf3de] text-[#3b6d11]' },
}

export function getInitials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function formatChatListTime(date: Date): string {
  if (isToday(date)) return format(date, 'H:mm')
  if (isYesterday(date)) return 'Вчера'
  const days = differenceInDays(new Date(), date)
  if (days < 7) {
    const label = format(date, 'EEE', { locale: ru })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return format(date, 'dd.MM.yy')
}

export function formatMessageTime(date: Date): string {
  const now = new Date()
  const messageDate = new Date(date)
  if (isToday(messageDate)) return format(messageDate, 'H:mm')
  const hoursDiff = differenceInHours(now, messageDate)
  if (hoursDiff < 24) return `${hoursDiff} ч`
  const daysDiff = differenceInDays(now, messageDate)
  if (daysDiff < 30) return `${daysDiff} д`
  return format(messageDate, 'dd.MM.yyyy')
}

export function formatMessagePreview(
  content: string | undefined,
  isOwn: boolean,
  hasImage?: boolean
): string {
  if (!content?.trim() && hasImage) return isOwn ? 'Вы: Фото' : 'Фото'
  const text = content?.trim() || ''
  if (text.length > 80) return `${isOwn ? 'Вы: ' : ''}${text.slice(0, 80)}…`
  return isOwn ? `Вы: ${text}` : text
}

export function isSystemStyleMessage(content: string): boolean {
  return (
    content.includes('откликнулся') ||
    content.includes('📋') ||
    content.includes('**') ||
    content.includes('Ссылка:')
  )
}

export function formatDateDivider(date: Date): string {
  if (isToday(date)) return 'Сегодня'
  if (isYesterday(date)) return 'Вчера'
  return format(date, 'd MMMM', { locale: ru })
}
