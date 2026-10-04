import type { AdminRole } from '@/lib/admin'
import type { IconType } from 'react-icons'
import {
  FiBarChart2,
  FiBriefcase,
  FiCreditCard,
  FiFileText,
  FiFlag,
  FiHome,
  FiImage,
  FiLayers,
  FiMessageSquare,
  FiRefreshCw,
  FiSettings,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiUsers,
} from 'react-icons/fi'

export type AdminNavItem = {
  title: string
  href: string
  icon: IconType
  roles: AdminRole[]
  countKey?: keyof AdminNavCounts
  alertCountKey?: keyof AdminNavCounts
  emoji?: string
}

export type AdminNavSection = {
  title: string
  items: AdminNavItem[]
}

export type AdminNavCounts = {
  users: number
  masters: number
  sellers: number
  restrictions: number
  orders: number
  products: number
  complaints: number
  complaintsNew: number
  pro: number
  moderation: number
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: 'Обзор',
    items: [
      { title: 'Дашборд', href: '/admin', icon: FiHome, roles: ['super_admin', 'moderator', 'support'], emoji: '📊' },
      { title: 'Аналитика', href: '/admin/analytics', icon: FiBarChart2, roles: ['super_admin', 'moderator'], emoji: '📈' },
    ],
  },
  {
    title: 'Пользователи',
    items: [
      { title: 'Все пользователи', href: '/admin/users', icon: FiUsers, roles: ['super_admin', 'moderator', 'support'], countKey: 'users', emoji: '👥' },
      { title: 'Мастера', href: '/admin/masters', icon: FiBriefcase, roles: ['super_admin', 'moderator'], countKey: 'masters', emoji: '🔨' },
      { title: 'Продавцы', href: '/admin/users?role=seller', icon: FiShoppingBag, roles: ['super_admin', 'moderator', 'support'], countKey: 'sellers', emoji: '🛒' },
      { title: 'Ограничения', href: '/admin/security', icon: FiShield, roles: ['super_admin', 'moderator'], alertCountKey: 'restrictions', emoji: '🚫' },
    ],
  },
  {
    title: 'Контент',
    items: [
      { title: 'Заказы', href: '/admin/orders', icon: FiFileText, roles: ['super_admin', 'moderator', 'support'], countKey: 'orders', emoji: '📋' },
      { title: 'Товары', href: '/admin/moderation?type=product', icon: FiShoppingBag, roles: ['super_admin', 'moderator'], countKey: 'products', emoji: '📦' },
      { title: 'Посты ленты', href: '/admin/moderation', icon: FiLayers, roles: ['super_admin', 'moderator'], emoji: '📰' },
      { title: 'Отзывы', href: '/admin/reviews', icon: FiStar, roles: ['super_admin', 'moderator', 'support'], emoji: '⭐' },
      { title: 'Жалобы', href: '/admin/complaints', icon: FiFlag, roles: ['super_admin', 'moderator', 'support'], alertCountKey: 'complaintsNew', emoji: '🚩' },
    ],
  },
  {
    title: 'Монетизация',
    items: [
      { title: 'PRO-подписки', href: '/admin/subscriptions', icon: FiRefreshCw, roles: ['super_admin'], countKey: 'pro', emoji: '👑' },
      { title: 'Баннеры/Реклама', href: '/admin/banners', icon: FiImage, roles: ['super_admin', 'moderator'], emoji: '🖼️' },
      { title: 'Категории', href: '/admin/images', icon: FiLayers, roles: ['super_admin', 'moderator'], emoji: '🏷️' },
    ],
  },
  {
    title: 'Система',
    items: [
      { title: 'Админ-роли', href: '/admin/security', icon: FiShield, roles: ['super_admin', 'moderator'], emoji: '🛡' },
      { title: 'Сообщения', href: '/admin/messages', icon: FiMessageSquare, roles: ['super_admin', 'moderator'], emoji: '📜' },
      { title: 'Модерация', href: '/admin/moderation', icon: FiShield, roles: ['super_admin', 'moderator'], alertCountKey: 'moderation', emoji: '⏳' },
      { title: 'Оплата', href: '/admin/payments', icon: FiCreditCard, roles: ['super_admin'], emoji: '💳' },
      { title: 'Настройки', href: '/admin/settings', icon: FiSettings, roles: ['super_admin'], emoji: '⚙️' },
    ],
  },
]

export function filterNavByRole(role: AdminRole): AdminNavSection[] {
  return ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0)
}

export type AdminPageMeta = {
  title: string
  subtitle?: string
  action?: { label: string; href: string }
}

export function getAdminPageMeta(pathname: string): AdminPageMeta {
  const base = pathname.split('?')[0]
  const map: Record<string, AdminPageMeta> = {
    '/admin': { title: 'Дашборд' },
    '/admin/analytics': { title: 'Аналитика', subtitle: 'Метрики и отчёты платформы' },
    '/admin/users': { title: 'Пользователи', subtitle: 'Управление аккаунтами' },
    '/admin/masters': { title: 'Мастера', subtitle: 'Верификация и профили мастеров' },
    '/admin/orders': { title: 'Заказы', subtitle: 'Мониторинг и поддержка заказов' },
    '/admin/complaints': { title: 'Жалобы', subtitle: 'Обработка обращений пользователей' },
    '/admin/reviews': { title: 'Отзывы', subtitle: 'Модерация отзывов' },
    '/admin/messages': { title: 'Сообщения', subtitle: 'Коммуникация с пользователями' },
    '/admin/moderation': { title: 'Модерация', subtitle: 'Контент на проверке' },
    '/admin/banners': { title: 'Баннеры', subtitle: 'Рекламные материалы', action: { label: '+ Создать баннер', href: '/admin/banners' } },
    '/admin/images': { title: 'Категории', subtitle: 'Изображения категорий и специализаций' },
    '/admin/subscriptions': { title: 'PRO-подписки', subtitle: 'Управление подписками' },
    '/admin/security': { title: 'Безопасность', subtitle: 'Роли и ограничения' },
    '/admin/payments': { title: 'Оплата', subtitle: 'Настройки платёжных систем' },
    '/admin/settings': { title: 'Настройки', subtitle: 'Системные параметры' },
  }
  return map[base] ?? { title: 'Админ-панель', subtitle: 'VAY-MASTER' }
}

export function formatAdminCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`
  return String(n)
}

export function formatAdminNumber(n: number): string {
  return n.toLocaleString('ru-RU')
}
