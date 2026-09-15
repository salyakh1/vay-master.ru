'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import AppTopHeader from '@/components/AppTopHeader'
import {
  FiHome,
  FiShoppingBag,
  FiMessageCircle,
  FiUser,
  FiSearch,
  FiClipboard,
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

  const feedHref = '/feed'
  const chatsHref = '/chats'
  const profileHref = user ? `/profile/${user.id}` : '/auth/login'
  const feedActive = pathname === '/feed' || pathname?.startsWith('/feed/')
  const sellersActive = Boolean(pathname?.startsWith('/products'))
  const mastersActive = pathname === '/search' || Boolean(pathname?.startsWith('/search/'))
  const chatsActive = Boolean(pathname?.startsWith('/chats'))
  const ordersActive = Boolean(pathname?.startsWith('/orders'))
  const profileActive = Boolean(pathname?.startsWith('/profile') || pathname?.startsWith('/settings'))
  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 py-1.5 sm:py-2 min-w-0 transition-colors ${
      active ? 'text-brand-accent' : 'text-[#8e8e93] hover:text-[#1c1c1e]'
    }`

  const bottomNav = user ? (
    <nav
      className="fixed bottom-0 left-0 right-0 w-full max-w-[100vw] bg-white border-t border-[#e5e5ea] z-[100] pointer-events-auto"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="max-w-lg mx-auto w-full">
        <div className="grid grid-cols-6 gap-0 min-h-[52px] sm:min-h-[56px] w-full">
          <Link href={feedHref} className={itemClass(feedActive)} prefetch={false}>
            <FiHome className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={feedActive ? 2.5 : 2} />
            <span className={`text-[9px] sm:text-[10px] leading-tight truncate w-full text-center ${feedActive ? 'font-semibold' : 'font-medium'}`}>
              Лента
            </span>
          </Link>

          <Link href="/products" className={itemClass(sellersActive)} prefetch={false}>
            <FiShoppingBag className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={sellersActive ? 2.5 : 2} />
            <span className={`text-[9px] sm:text-[10px] leading-tight truncate w-full text-center ${sellersActive ? 'font-semibold' : 'font-medium'}`}>
              Продавцы
            </span>
          </Link>

          <Link href="/search" className={itemClass(mastersActive)} prefetch={false}>
            <FiSearch className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={mastersActive ? 2.5 : 2} />
            <span className={`text-[9px] sm:text-[10px] leading-tight truncate w-full text-center ${mastersActive ? 'font-semibold' : 'font-medium'}`}>
              Мастера
            </span>
          </Link>

          <Link href="/orders" className={itemClass(ordersActive)} prefetch={false}>
            <FiClipboard className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={ordersActive ? 2.5 : 2} />
            <span className={`text-[9px] sm:text-[10px] leading-tight truncate w-full text-center ${ordersActive ? 'font-semibold' : 'font-medium'}`}>
              Заказы
            </span>
          </Link>

          <Link href={chatsHref} className={`${itemClass(chatsActive)} relative`} prefetch={false}>
            <div className="relative flex-shrink-0">
              <FiMessageCircle className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={chatsActive ? 2.5 : 2} />
              {!chatsActive && unreadChatsCount > 0 && (
                <span className="absolute -top-0.5 -right-1.5 bg-brand-accent text-white text-[8px] sm:text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                  {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                </span>
              )}
            </div>
            <span className={`text-[9px] sm:text-[10px] leading-tight truncate w-full text-center ${chatsActive ? 'font-semibold' : 'font-medium'}`}>
              Чаты
            </span>
          </Link>

          <Link href={profileHref} className={itemClass(profileActive)} prefetch={false}>
            <FiUser className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={profileActive ? 2.5 : 2} />
            <span className={`text-[9px] sm:text-[10px] leading-tight truncate w-full text-center ${profileActive ? 'font-semibold' : 'font-medium'}`}>
              Профиль
            </span>
          </Link>
        </div>
      </div>
    </nav>
  ) : null

  if (bottomOnly) return bottomNav
  if (topOnly) return <AppTopHeader />

  return (
    <>
      <AppTopHeader />
      {bottomNav}
    </>
  )
}
