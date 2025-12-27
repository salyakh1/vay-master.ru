'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import { FiHome, FiShoppingBag, FiMessageCircle, FiUser, FiLogOut, FiSearch, FiBriefcase } from 'react-icons/fi'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [unreadChatsCount, setUnreadChatsCount] = useState(0)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  useEffect(() => {
    if (!user) return

    const fetchUnreadChatsCount = async () => {
      try {
        // Получаем все чаты пользователя
        const { data: chats, error: chatsError } = await supabase
          .from('chats')
          .select('id, deleted_by_user_ids')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

        if (chatsError || !chats) return

        // Фильтруем чаты, которые были удалены пользователем
        const filteredChats = chats.filter((chat: any) => {
          const deletedByUserIds = (chat.deleted_by_user_ids || []) as string[]
          return !deletedByUserIds.includes(user.id)
        })

        if (filteredChats.length === 0) {
          setUnreadChatsCount(0)
          return
        }

        const chatIds = filteredChats.map((chat: any) => chat.id)

        // Для каждого чата проверяем, есть ли непрочитанные сообщения
        const unreadPromises = chatIds.map(async (chatId: string) => {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', chatId)
            .eq('read', false)
            .neq('sender_id', user.id)

          return (count ?? 0) > 0 ? 1 : 0
        })

        const unreadResults = await Promise.all(unreadPromises)
        const unreadCount = unreadResults.reduce((sum: number, count: number) => sum + count, 0)
        setUnreadChatsCount(unreadCount)
      } catch (error) {
        console.error('Error fetching unread chats count:', error)
      }
    }

    fetchUnreadChatsCount()

    // Подписываемся на изменения сообщений для обновления счетчика
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
        () => {
          fetchUnreadChatsCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadChatsCount()
        }
      )
      .subscribe()

    // Слушаем кастомное событие обновления счетчика
    const handleMessagesRead = (event: any) => {
      console.log('messagesRead event received in Navbar, chatId:', event.detail?.chatId)
      // Обновляем счетчик с задержкой для гарантии обновления в базе данных
      setTimeout(() => {
        console.log('Refreshing unread chats count...')
        fetchUnreadChatsCount()
      }, 500)
    }
    window.addEventListener('messagesRead', handleMessagesRead)
    
    // Также обновляем при возврате на страницу
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page visible, refreshing unread chats count...')
        fetchUnreadChatsCount()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Обновляем при фокусе на окне
    const handleFocus = () => {
      console.log('Window focused, refreshing unread chats count...')
      fetchUnreadChatsCount()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('messagesRead', handleMessagesRead)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  if (!user) return null

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border-color">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-semibold text-text-primary">
              VayMaster
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <FiLogOut size={18} />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      {/* Fixed bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-border-color z-50 safe-area-inset-bottom pointer-events-auto">
        <div className="container mx-auto px-2">
          <div className="flex items-center justify-around h-16 pointer-events-auto">
            <Link
              href="/feed"
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-2 transition-colors ${
                pathname === '/feed'
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              prefetch={true}
            >
              <FiHome size={22} />
              <span className="text-xs font-normal">Лента</span>
            </Link>

            <Link
              href="/search"
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-2 transition-colors ${
                pathname === '/search'
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              prefetch={true}
            >
              <FiSearch size={22} />
              <span className="text-xs font-normal">Мастера</span>
            </Link>

            <Link
              href="/orders"
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-2 transition-colors ${
                pathname?.startsWith('/orders')
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              prefetch={true}
            >
              <FiBriefcase size={22} />
              <span className="text-xs font-normal">Заказы</span>
            </Link>

            <Link
              href="/products"
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-2 transition-colors ${
                pathname?.startsWith('/products')
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              prefetch={true}
            >
              <FiShoppingBag size={22} />
              <span className="text-xs font-normal">Товары</span>
            </Link>

            <Link
              href="/chats"
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-2 transition-colors relative ${
                pathname?.startsWith('/chats')
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              prefetch={true}
            >
              <div className="relative">
                <FiMessageCircle size={22} />
                {!pathname?.startsWith('/chats') && (unreadChatsCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-normal">Чаты</span>
            </Link>

            <Link
              href={`/profile/${user.id}`}
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-2 transition-colors ${
                pathname?.startsWith('/profile')
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              prefetch={true}
            >
              <FiUser size={22} />
              <span className="text-xs font-normal">Профиль</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}

