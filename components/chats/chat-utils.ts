import { format, isToday, isYesterday, differenceInHours, differenceInDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { UserRole } from '@/types/db'

const PRODUCT_PATH_RE =
  /\/products\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g

export function productChatPath(productId: string): string {
  return `/products/${productId}`
}

/** Черновик для поля ввода — без ссылки на товар. */
export function buildProductInterestMessage(product: { name: string; price: number }): string {
  const price = Number(product.price || 0).toLocaleString('ru-RU')
  return `Здравствуйте! Интересует товар «${product.name}» за ${price} ₽`
}

/** Убрать /products/<uuid> из текста (старые автосообщения и превью). */
export function stripProductPathFromContent(content: string): string {
  return content
    .replace(PRODUCT_PATH_RE, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Уже писали про этот товар (старые сообщения со ссылкой или текст интереса). */
export function hasProductContextMessage(
  messages: Array<{ content?: string | null }>,
  productId: string,
  productName?: string
): boolean {
  const marker = productChatPath(productId)
  const nameMarker = productName ? `«${productName}»` : ''
  return messages.some((m) => {
    const c = m.content || ''
    if (c.includes(marker)) return true
    if (nameMarker && c.includes('Интересует товар') && c.includes(nameMarker)) return true
    return false
  })
}

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
  const text = stripProductPathFromContent(content?.trim() || '')
  if (!text && hasImage) return isOwn ? 'Вы: Фото' : 'Фото'
  if (!text) return isOwn ? 'Вы: Сообщение' : 'Сообщение'
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
