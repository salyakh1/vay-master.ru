'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import {
  FiMenu,
  FiBookOpen,
  FiHelpCircle,
  FiActivity,
  FiMap,
  FiUser,
  FiSettings,
} from 'react-icons/fi'

export const APP_TOP_HEADER_HEIGHT = 52

type AppTopHeaderProps = {
  /** Дополнительные кнопки справа (перекрывают меню/авторизацию) */
  rightSlot?: ReactNode
  className?: string
}

export function AppTopHeaderBrand() {
  return (
    <Link
      href="/"
      className="text-base font-extrabold text-[#111] tracking-wide whitespace-nowrap"
    >
      VAY<span className="text-brand-accent">-</span>MASTER
    </Link>
  )
}

export default function AppTopHeader({ rightSlot, className = '' }: AppTopHeaderProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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

  const openSupportChat = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
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
    <header
      className={`sticky top-0 z-50 bg-white border-b border-[#e5e5ea] w-full ${className}`}
      style={{ minHeight: APP_TOP_HEADER_HEIGHT }}
    >
      <div className="max-w-lg mx-auto w-full flex items-center justify-between px-4 py-2.5">
        <AppTopHeaderBrand />

        {rightSlot ?? (
          <>
            {!authLoading && !user && (
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href="/auth/login"
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-[#e0e0e0] text-[#333]"
                >
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-brand-accent text-white"
                >
                  Начать
                </Link>
              </div>
            )}

            {user && (
              <div className="relative global-menu-container flex-shrink-0">
                <button
                  type="button"
                  aria-label="Открыть меню"
                  onClick={() => setIsMenuOpen((v) => !v)}
                  className="w-9 h-9 rounded-lg hover:bg-[#f2f2f7] transition-colors text-[#1c1c1e] flex items-center justify-center"
                >
                  <FiMenu size={20} strokeWidth={2.5} />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-[#e5e5ea] rounded-xl shadow-lg min-w-[220px] z-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false)
                        router.push(`/profile/${user.id}`)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f2f2f7] transition-colors text-left text-[#1c1c1e] font-medium text-sm"
                    >
                      <FiUser size={18} />
                      <span>Профиль</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false)
                        router.push('/settings')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f2f2f7] transition-colors text-left text-[#1c1c1e] font-medium text-sm"
                    >
                      <FiSettings size={18} />
                      <span>Настройки</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false)
                        router.push('/activity')
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f2f2f7] transition-colors text-left text-[#1c1c1e] font-medium text-sm"
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
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f2f2f7] transition-colors text-left text-[#1c1c1e] font-medium text-sm"
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
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f2f2f7] transition-colors text-left text-[#1c1c1e] font-medium text-sm"
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
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f2f2f7] transition-colors text-left text-[#1c1c1e] font-medium text-sm"
                    >
                      <FiHelpCircle size={18} />
                      <span>Техподдержка</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  )
}
