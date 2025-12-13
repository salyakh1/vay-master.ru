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
      {/* Top header - Minimalist */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="text-xl font-bold text-black">
              VayMaster
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-black transition-colors"
            >
              <FiLogOut size={16} />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      {/* Fixed bottom navigation - Minimalist */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="container mx-auto px-2">
          <div className="flex items-center justify-around h-14">
            <Link
              href="/feed"
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-2 transition-colors ${
                pathname === '/feed'
                  ? 'text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <FiHome size={20} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Лента</span>
            </Link>

            <Link
              href="/search"
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-2 transition-colors ${
                pathname === '/search'
                  ? 'text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <FiSearch size={20} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Мастера</span>
            </Link>

            <Link
              href="/orders"
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-2 transition-colors ${
                pathname?.startsWith('/orders')
                  ? 'text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <FiBriefcase size={20} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Заказы</span>
            </Link>

            {user.role === 'seller' && (
              <Link
                href="/products"
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-2 transition-colors ${
                  pathname?.startsWith('/products')
                    ? 'text-black'
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                <FiShoppingBag size={20} />
                <span className="text-[10px] font-medium uppercase tracking-wide">Товары</span>
              </Link>
            )}

            <Link
              href="/chats"
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-2 transition-colors ${
                pathname?.startsWith('/chats')
                  ? 'text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <FiMessageCircle size={20} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Чаты</span>
            </Link>

            <Link
              href={`/profile/${user.id}`}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-2 transition-colors ${
                pathname?.startsWith('/profile')
                  ? 'text-black'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              <FiUser size={20} />
              <span className="text-[10px] font-medium uppercase tracking-wide">Профиль</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}

