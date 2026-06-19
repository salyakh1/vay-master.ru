'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AdminNavCounts } from '@/components/admin/adminNavConfig'

const MOBILE_TABS = [
  { href: '/admin', label: 'Дашборд', emoji: '📊' },
  { href: '/admin/users', label: 'Юзеры', emoji: '👥' },
  { href: '/admin/complaints', label: 'Жалобы', emoji: '🚩', badgeKey: 'complaintsNew' as const },
  { href: '/admin/subscriptions', label: 'PRO', emoji: '👑' },
  { href: '/admin/settings', label: 'Ещё', emoji: '⚙️', openMenu: true },
]

type AdminMobileNavProps = {
  counts: AdminNavCounts
  onMoreClick: () => void
}

export default function AdminMobileNav({ counts, onMoreClick }: AdminMobileNavProps) {
  const pathname = usePathname() || ''

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e5e5ea] flex px-1 pt-1.5 pb-3 safe-area-pb">
      {MOBILE_TABS.map((tab) => {
        const active = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href)
        const badge = tab.badgeKey ? counts[tab.badgeKey] : 0

        if (tab.openMenu) {
          return (
            <button
              key={tab.label}
              type="button"
              onClick={onMoreClick}
              className="flex-1 flex flex-col items-center gap-0.5 min-w-0"
            >
              <span className="text-lg text-[#c7c7cc]">{tab.emoji}</span>
              <span className="text-[8px] text-[#8e8e93]">{tab.label}</span>
            </button>
          )
        }

        return (
          <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center gap-0.5 min-w-0 relative">
            <span className={`text-lg ${active ? 'text-brand-accent' : 'text-[#c7c7cc]'}`}>{tab.emoji}</span>
            <span className={`text-[8px] ${active ? 'text-brand-accent font-bold' : 'text-[#8e8e93]'}`}>{tab.label}</span>
            {badge > 0 && tab.badgeKey === 'complaintsNew' && (
              <span className="absolute top-0 right-[22%] min-w-[14px] h-[14px] bg-brand-accent text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
