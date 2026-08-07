'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import { getAdminPageMeta } from '@/components/admin/adminNavConfig'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { FiBell, FiLogOut, FiMenu, FiSearch } from 'react-icons/fi'

type AdminHeaderProps = {
  onMenuClick?: () => void
  complaintsNew?: number
}

export default function AdminHeader({ onMenuClick, complaintsNew = 0 }: AdminHeaderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname() || '/admin'
  const meta = getAdminPageMeta(pathname)

  const subtitle =
    pathname === '/admin'
      ? `РћР±Р·РѕСЂ РїР»Р°С‚С„РѕСЂРјС‹ РЅР° ${format(new Date(), 'd MMMM yyyy', { locale: ru })}`
      : meta.subtitle

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="bg-white border-b border-admin-border px-4 md:px-6 py-3.5 flex items-center justify-between gap-3 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 rounded-lg bg-admin-bg border border-admin-border flex items-center justify-center text-admin-ink shrink-0"
          aria-label="РњРµРЅСЋ"
        >
          <FiMenu size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-admin-ink truncate">{meta.title}</h1>
          {subtitle && <p className="text-[11px] text-admin-muted mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/admin/users"
          className="hidden sm:flex items-center gap-1.5 bg-admin-bg border border-admin-border rounded-[10px] px-3 py-1.5 text-[11px] text-admin-muted w-[180px]"
        >
          <FiSearch size={12} className="text-brand-accent shrink-0" />
          <span className="truncate">РџРѕРёСЃРє РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ...</span>
        </Link>

        <Link
          href="/admin/complaints"
          className="relative w-8 h-8 rounded-lg bg-admin-bg border border-admin-border flex items-center justify-center text-base"
          aria-label="РЈРІРµРґРѕРјР»РµРЅРёСЏ"
        >
          <FiBell size={15} className="text-admin-ink" />
          {complaintsNew > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-accent rounded-full border border-white" />
          )}
        </Link>

        {meta.action && (
          <Link
            href={meta.action.href}
            className="hidden md:inline-flex bg-brand-accent text-white text-[11px] font-bold px-3.5 py-2 rounded-lg whitespace-nowrap"
          >
            {meta.action.label}
          </Link>
        )}

        {pathname === '/admin' && (
          <Link
            href="/admin/banners"
            className="hidden md:inline-flex bg-brand-accent text-white text-[11px] font-bold px-3.5 py-2 rounded-lg whitespace-nowrap"
          >
            + РЎРѕР·РґР°С‚СЊ Р±Р°РЅРЅРµСЂ
          </Link>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="hidden md:flex items-center gap-1.5 text-[11px] text-admin-muted hover:text-admin-ink font-medium px-2"
          title={user?.email ?? 'Р’С‹Р№С‚Рё'}
        >
          <FiLogOut size={14} />
        </button>
      </div>
    </header>
  )
}

