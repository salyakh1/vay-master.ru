'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { FiHome, FiShoppingBag, FiMessageCircle, FiUser, FiLogOut, FiSearch, FiBriefcase } from 'react-icons/fi'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

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
              className={`flex flex-col items-center justify-center gap-1 min-w-[60px] py-2 transition-colors ${
                pathname?.startsWith('/chats')
                  ? 'text-brand-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              prefetch={true}
            >
              <FiMessageCircle size={22} />
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

