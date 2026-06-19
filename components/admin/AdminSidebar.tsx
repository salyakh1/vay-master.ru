'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type AdminRole } from '@/lib/admin'
import { useAuth } from '@/app/providers'
import {
  filterNavByRole,
  formatAdminCount,
  type AdminNavCounts,
  type AdminNavItem,
} from '@/components/admin/adminNavConfig'
import { FiTool } from 'react-icons/fi'

interface AdminSidebarProps {
  role: AdminRole
  counts: AdminNavCounts
  onNavigate?: () => void
  className?: string
}

function isItemActive(pathname: string, href: string) {
  const [path, query] = href.split('?')
  if (pathname === path) {
    if (!query) return true
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(query)
      const current = new URLSearchParams(window.location.search)
      let match = true
      params.forEach((v, k) => {
        if (current.get(k) !== v) match = false
      })
      return match
    }
  }
  if (path !== '/admin' && pathname.startsWith(path + '/')) return true
  return false
}

function NavItem({
  item,
  pathname,
  counts,
  onNavigate,
}: {
  item: AdminNavItem
  pathname: string
  counts: AdminNavCounts
  onNavigate?: () => void
}) {
  const active = isItemActive(pathname, item.href)
  const count = item.countKey ? counts[item.countKey] : undefined
  const alert = item.alertCountKey ? counts[item.alertCountKey] : undefined

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 py-2 px-[18px] text-[12.5px] font-medium relative transition-colors ${
        active ? 'bg-[#27272a] text-white font-semibold' : 'text-[#aeaeb2] hover:bg-[#27272a] hover:text-white'
      }`}
    >
      {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-accent" aria-hidden />}
      <span className="w-[18px] text-center text-[15px] shrink-0">{item.emoji ?? '•'}</span>
      <span className="truncate">{item.title}</span>
      {alert != null && alert > 0 ? (
        <span className="ml-auto bg-brand-accent text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg">
          {alert}
        </span>
      ) : count != null && count > 0 ? (
        <span className="ml-auto bg-[#3a3a3e] text-[#aeaeb2] text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg">
          {formatAdminCount(count)}
        </span>
      ) : null}
    </Link>
  )
}

export default function AdminSidebar({ role, counts, onNavigate, className = '' }: AdminSidebarProps) {
  const pathname = usePathname() || ''
  const { user } = useAuth()
  const sections = filterNavByRole(role)

  const initials =
    user?.full_name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'AD'

  const roleLabel =
    role === 'super_admin' ? 'Super Admin' : role === 'moderator' ? 'Модератор' : 'Поддержка'

  return (
    <aside className={`w-[220px] bg-[#1c1c1e] flex flex-col shrink-0 ${className}`}>
      <div className="flex items-center gap-2 px-[18px] py-4 border-b border-[#333]">
        <div className="w-7 h-7 rounded-[7px] bg-brand-accent flex items-center justify-center shrink-0">
          <FiTool className="text-white" size={14} />
        </div>
        <span className="text-sm font-black text-white tracking-tight">
          VAY<span className="text-brand-accent">–</span>MASTER
        </span>
        <span className="ml-auto text-[8px] font-bold text-[#8e8e93] bg-[#2a2a2e] px-1.5 py-0.5 rounded-[5px]">
          ADMIN
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="px-[18px] pt-3.5 pb-1.5">
              <span className="text-[9px] font-bold text-[#6d6d72] uppercase tracking-widest">{section.title}</span>
            </div>
            {section.items.map((item) => (
              <NavItem key={item.href + item.title} item={item} pathname={pathname} counts={counts} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <div className="px-[18px] py-3.5 border-t border-[#333] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-white truncate">{user?.full_name || roleLabel}</div>
          <div className="text-[9px] text-[#8e8e93] truncate">{user?.email}</div>
        </div>
      </div>
    </aside>
  )
}
