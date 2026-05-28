'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type AdminRole } from '@/lib/admin'
import {
  FiHome,
  FiUsers,
  FiBriefcase,
  FiShoppingBag,
  FiAlertCircle,
  FiShield,
  FiBarChart2,
  FiSettings,
  FiTag,
  FiFileText,
  FiImage,
  FiMessageSquare,
  FiStar,
  FiCreditCard,
  FiLayers,
  FiRefreshCw,
} from 'react-icons/fi'

interface AdminSidebarProps {
  role: AdminRole
  currentPath: string
}

export default function AdminSidebar({ role, currentPath }: AdminSidebarProps) {
  const menuItems = [
    {
      title: 'Дашборд',
      href: '/admin',
      icon: FiHome,
      roles: ['super_admin', 'moderator', 'support'],
    },
    {
      title: 'Пользователи',
      href: '/admin/users',
      icon: FiUsers,
      roles: ['super_admin', 'moderator', 'support'],
    },
    {
      title: 'Мастера',
      href: '/admin/masters',
      icon: FiBriefcase,
      roles: ['super_admin', 'moderator'],
    },
    {
      title: 'Заказы',
      href: '/admin/orders',
      icon: FiFileText,
      roles: ['super_admin', 'moderator', 'support'],
    },
    {
      title: 'Жалобы',
      href: '/admin/complaints',
      icon: FiAlertCircle,
      roles: ['super_admin', 'moderator', 'support'],
    },
    {
      title: 'Отзывы',
      href: '/admin/reviews',
      icon: FiStar,
      roles: ['super_admin', 'moderator', 'support'],
    },
    {
      title: 'Писать пользователям',
      href: '/admin/messages',
      icon: FiMessageSquare,
      roles: ['super_admin', 'moderator'],
    },
    {
      title: 'Модерация',
      href: '/admin/moderation',
      icon: FiShield,
      roles: ['super_admin', 'moderator'],
    },
    {
      title: 'Реклама',
      href: '/admin/advertisements',
      icon: FiTag,
      roles: ['super_admin'],
    },
    {
      title: 'Баннеры',
      href: '/admin/banners',
      icon: FiImage,
      roles: ['super_admin', 'moderator'],
    },
    {
      title: 'Картинки',
      href: '/admin/images',
      icon: FiLayers,
      roles: ['super_admin', 'moderator'],
    },
    {
      title: 'Подписки',
      href: '/admin/subscriptions',
      icon: FiRefreshCw,
      roles: ['super_admin'],
    },
    {
      title: 'Безопасность',
      href: '/admin/security',
      icon: FiShield,
      roles: ['super_admin', 'moderator'],
    },
    {
      title: 'Аналитика',
      href: '/admin/analytics',
      icon: FiBarChart2,
      roles: ['super_admin', 'moderator'],
    },
    {
      title: 'Оплата',
      href: '/admin/payments',
      icon: FiCreditCard,
      roles: ['super_admin'],
    },
    {
      title: 'Настройки',
      href: '/admin/settings',
      icon: FiSettings,
      roles: ['super_admin'],
    },
  ]

  const filteredItems = menuItems.filter((item) => item.roles.includes(role))

  return (
    <aside className="w-64 bg-bg-card border-r border-border-light flex flex-col">
      <div className="p-6 border-b border-border-light">
        <h1 className="text-xl font-semibold text-graphite-secondary tracking-tight">VAY-MASTER</h1>
        <p className="text-xs text-text-muted mt-1 font-medium">Админ-панель</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors font-medium ${
                    isActive
                      ? 'bg-brand-accent text-white'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-graphite-secondary'
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="font-medium">{item.title}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border-light">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 text-text-secondary hover:bg-bg-secondary hover:text-graphite-secondary rounded-md transition-colors font-medium"
        >
          <FiHome size={20} strokeWidth={2} />
          <span className="font-medium">На сайт</span>
        </Link>
      </div>
    </aside>
  )
}

