'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import AppTopHeader from '@/components/AppTopHeader'
import {
  FiShoppingBag,
  FiMessageCircle,
  FiUser,
  FiSearch,
  FiBriefcase,
} from 'react-icons/fi'

type NavbarProps = {
  /** Только нижняя панель (шапка VAY-MASTER рендерится отдельно) */
  bottomOnly?: boolean
  /** Только верхняя шапка VAY-MASTER */
  topOnly?: boolean
}

export default function Navbar({ bottomOnly = false, topOnly = false }: NavbarProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [unreadChatsCount, setUnreadChatsCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const fetchUnreadChatsCount = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch('/api/chats/unread-count', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await res.json().catch(() => ({}))
        setUnreadChatsCount(typeof data.count === 'number' ? data.count : 0)
      } catch {
        setUnreadChatsCount(0)
      }
    }

    const scheduleFetch = () => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => fetchUnreadChatsCount(), { timeout: 5000 })
      } else {
        setTimeout(fetchUnreadChatsCount, 5000)
      }
    }
    scheduleFetch()

    const channel = supabase
      .channel('unread-chats-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: 'read=eq.false',
        },
        () => fetchUnreadChatsCount()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => fetchUnreadChatsCount()
      )
      .subscribe()

    const handleMessagesRead = () => {
      setTimeout(fetchUnreadChatsCount, 500)
    }
    window.addEventListener('messagesRead', handleMessagesRead)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('messagesRead', handleMessagesRead)
    }
  }, [user])

  const bottomNav = user ? (() => {
    const role = user.role
    const profileHref = `/profile/${user.id}`
    const tabs =
      role === 'master'
        ? ([
            { href: '/orders', label: 'Заказы', icon: FiBriefcase, match: (p: string) => p.startsWith('/orders') },
            { href: '/chats', label: 'Отклики', icon: FiMessageCircle, match: (p: string) => p.startsWith('/chats'), badge: unreadChatsCount },
            { href: profileHref, label: 'Профиль', icon: FiUser, match: (p: string) => p.startsWith('/profile') || p.startsWith('/settings') },
          ] as const)
        : role === 'seller'
          ? ([
              { href: '/products', label: 'Товары', icon: FiShoppingBag, match: (p: string) => p.startsWith('/products') },
              { href: '/orders', label: 'Заказы', icon: FiBriefcase, match: (p: string) => p.startsWith('/orders') },
              { href: profileHref, label: 'Профиль', icon: FiUser, match: (p: string) => p.startsWith('/profile') || p.startsWith('/settings') },
            ] as const)
          : ([
              { href: '/search', label: 'Поиск', icon: FiSearch, match: (p: string) => p === '/search' || p.startsWith('/search') },
              { href: '/orders', label: 'Заказы', icon: FiBriefcase, match: (p: string) => p.startsWith('/orders') },
              { href: '/chats', label: 'Чаты', icon: FiMessageCircle, match: (p: string) => p.startsWith('/chats'), badge: unreadChatsCount },
              { href: profileHref, label: 'Профиль', icon: FiUser, match: (p: string) => p.startsWith('/profile') || p.startsWith('/settings') },
            ] as const)

    const cols = tabs.length

    return (
    <nav
      className="fixed bottom-0 left-0 right-0 w-full max-w-[100vw] bg-white border-t border-[#e5e5ea] z-[100] pointer-events-auto"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="max-w-lg mx-auto w-full">
        <div
          className="grid gap-0 min-h-[52px] sm:min-h-[56px] w-full"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => {
            const active = tab.match(pathname || '')
            const Icon = tab.icon
            const badge = 'badge' in tab ? tab.badge : 0
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 sm:py-2 min-w-0 transition-colors relative ${
                  active ? 'text-brand-accent' : 'text-[#8e8e93] hover:text-[#1c1c1e]'
                }`}
                prefetch={false}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={active ? 2.5 : 2} />
                  {!active && typeof badge === 'number' && badge > 0 && (
                    <span className="absolute -top-0.5 -right-1.5 bg-brand-accent text-white text-[8px] sm:text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] sm:text-[10px] leading-tight truncate w-full text-center ${active ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
    )
  })() : null

  if (bottomOnly) return bottomNav
  if (topOnly) return <AppTopHeader />

  return (
    <>
      <AppTopHeader />
      {bottomNav}
    </>
  )
}
