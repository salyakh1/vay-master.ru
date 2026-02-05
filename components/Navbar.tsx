'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import {
  FiHome,
  FiShoppingBag,
  FiMessageCircle,
  FiUser,
  FiSearch,
  FiBriefcase,
  FiMenu,
  FiBookOpen,
  FiHelpCircle,
  FiActivity,
  FiMap,
} from 'react-icons/fi'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [unreadChatsCount, setUnreadChatsCount] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchUnreadChatsCount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
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

    // Отложенная загрузка счётчика — не конкурируем с первым экраном (5 с или idle)
    const scheduleFetch = () => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => fetchUnreadChatsCount(), { timeout: 5000 })
      } else {
        setTimeout(fetchUnreadChatsCount, 5000)
      }
    }
    scheduleFetch()

    // Realtime — единственный источник обновлений счётчика при новых сообщениях
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

  useEffect(() => {
    if (!isMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest?.('.global-menu-container')) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [isMenuOpen])

  if (!user) return null

  const openSupportChat = async () => {
    try {
      const res = await fetch('/api/welcome-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: user.role }),
      })
      const data = await res.json().catch(() => ({}))
      const chatId = data?.chatId
      if (res.ok && chatId) {
        router.push(`/chats/${chatId}`)
        return
      }
    } catch {
      // ignore
    }
    router.push('/chats')
  }

  return (
    <>
      {/* Top header - Глянцевый, премиальный */}
      <header className="sticky top-0 z-40 glass-strong border-b border-white/20 shadow-glass backdrop-blur-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-xl font-semibold bg-gradient-to-r from-graphite-secondary via-brand-accent to-graphite-secondary bg-clip-text text-transparent tracking-tight hover:from-brand-accent hover:via-brand-accent-hover hover:to-brand-accent transition-all">
                VAY-MASTER
              </Link>
              {user.role === 'master' && <NotificationBell />}
            </div>

            <div className="relative global-menu-container">
              <button
                type="button"
                aria-label="Открыть меню"
                onClick={() => setIsMenuOpen((v) => !v)}
                className="p-2 rounded-lg hover:bg-bg-secondary transition-colors text-graphite-secondary"
              >
                <FiMenu size={22} strokeWidth={2.5} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-bg-card border border-border-light rounded-md shadow-card min-w-[220px] z-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      router.push(`/profile/${user.id}`)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary transition-colors text-left text-graphite-secondary font-medium"
                  >
                    <FiUser size={18} />
                    <span>Профиль</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      router.push('/activity')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary transition-colors text-left text-graphite-secondary font-medium"
                  >
                    <FiActivity size={18} />
                    <span>Активность</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      router.push('/planner')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary transition-colors text-left text-graphite-secondary font-medium"
                  >
                    <FiMap size={18} />
                    <span>Планировщик</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      router.push('/rules')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary transition-colors text-left text-graphite-secondary font-medium"
                  >
                    <FiBookOpen size={18} />
                    <span>Правила</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false)
                      openSupportChat()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-secondary transition-colors text-left text-graphite-secondary font-medium"
                  >
                    <FiHelpCircle size={18} />
                    <span>Техподдержка</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Fixed bottom navigation - Глянцевая, премиальная */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-white/20 shadow-glass backdrop-blur-md z-[100] safe-area-inset-bottom pointer-events-auto">
        <div className="w-full px-0">
          <div className="flex items-center justify-between sm:justify-evenly h-16 pointer-events-auto w-full">
            <Link
              href="/feed"
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 flex-1 min-w-0 py-2 transition-all relative group ${
                pathname === '/feed'
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-brand-accent'
              }`}
              prefetch={false}
            >
              <div className={`relative ${pathname === '/feed' ? 'glow-effect' : ''}`}>
                <FiHome className="w-5 h-5 sm:w-[22px] sm:h-[22px] transition-all group-hover:scale-110" strokeWidth={pathname === '/feed' ? 2.5 : 2} />
                {pathname === '/feed' && (
                  <div className="absolute inset-0 bg-brand-accent/20 rounded-full blur-md -z-10"></div>
                )}
              </div>
              <span className={`text-[10px] sm:text-xs font-medium leading-tight transition-all ${pathname === '/feed' ? 'font-semibold' : ''}`}>Лента</span>
            </Link>

            <Link
              href="/search"
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 flex-1 min-w-0 py-2 transition-colors ${
                pathname === '/search'
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-graphite-secondary'
              }`}
              prefetch={false}
            >
              <FiSearch className="w-5 h-5 sm:w-[22px] sm:h-[22px]" strokeWidth={pathname === '/search' ? 2.5 : 2} />
              <span className="text-[10px] sm:text-xs font-medium leading-tight">Мастера</span>
            </Link>

            <Link
              href="/orders"
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 flex-1 min-w-0 py-2 transition-colors ${
                pathname?.startsWith('/orders')
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-graphite-secondary'
              }`}
              prefetch={false}
            >
              <FiBriefcase className="w-5 h-5 sm:w-[22px] sm:h-[22px]" strokeWidth={pathname?.startsWith('/orders') ? 2.5 : 2} />
              <span className="text-[10px] sm:text-xs font-medium leading-tight">Заказы</span>
            </Link>

            <Link
              href="/products"
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 flex-1 min-w-0 py-2 transition-colors ${
                pathname?.startsWith('/products')
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-graphite-secondary'
              }`}
              prefetch={false}
            >
              <FiShoppingBag className="w-5 h-5 sm:w-[22px] sm:h-[22px]" strokeWidth={pathname?.startsWith('/products') ? 2.5 : 2} />
              <span className="text-[10px] sm:text-xs font-medium leading-tight">Товары</span>
            </Link>

            <Link
              href="/chats"
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 flex-1 min-w-0 py-2 transition-colors relative ${
                pathname?.startsWith('/chats')
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-graphite-secondary'
              }`}
              prefetch={false}
            >
              <div className="relative">
                <FiMessageCircle className="w-5 h-5 sm:w-[22px] sm:h-[22px]" strokeWidth={pathname?.startsWith('/chats') ? 2.5 : 2} />
                {!pathname?.startsWith('/chats') && (unreadChatsCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-br from-brand-accent to-brand-accent-hover text-white text-[9px] sm:text-[10px] font-bold rounded-full min-w-[16px] sm:min-w-[18px] h-4 sm:h-4.5 flex items-center justify-center px-1 sm:px-1.5 shadow-glow border border-white/30">
                    {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-xs font-medium leading-tight">Чаты</span>
            </Link>

            <Link
              href={`/profile/${user.id}`}
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 flex-1 min-w-0 py-2 transition-colors ${
                pathname?.startsWith('/profile')
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-graphite-secondary'
              }`}
              prefetch={false}
            >
              <FiUser className="w-5 h-5 sm:w-[22px] sm:h-[22px]" strokeWidth={pathname?.startsWith('/profile') ? 2.5 : 2} />
              <span className="text-[10px] sm:text-xs font-medium leading-tight">Профиль</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}

