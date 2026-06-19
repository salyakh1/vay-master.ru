'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '../providers'
import { isAdmin, getAdminRole, type AdminRole } from '@/lib/admin'
import { createLogger } from '@/lib/logger'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminMobileNav from '@/components/admin/AdminMobileNav'
import { useAdminNavCounts } from '@/hooks/useAdminNavCounts'

const logger = createLogger('admin')

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { counts } = useAdminNavCounts()

  useEffect(() => {
    if (pathname === '/admin/login') {
      setChecking(false)
      return
    }

    async function checkAdminAccess() {
      if (authLoading) return

      if (!user) {
        router.push('/admin/login')
        setChecking(false)
        return
      }

      logger.debug('Checking admin status for user', user.id)
      try {
        const isUserAdmin = await isAdmin(user.id)
        if (!isUserAdmin) {
          setError(`У пользователя ${user.id} нет прав администратора.\n\nВыполните SQL скрипт supabase/assign_admin_current_user.sql в Supabase SQL Editor.`)
          setChecking(false)
          return
        }

        const role = await getAdminRole(user.id)
        if (!role) {
          setError(`Роль администратора не найдена для пользователя ${user.id}`)
          setChecking(false)
          return
        }

        setAdminRole(role)
        setChecking(false)
        setError(null)
      } catch (err) {
        setError(`Ошибка при проверке прав: ${err instanceof Error ? err.message : String(err)}`)
        setChecking(false)
      }
    }

    checkAdminAccess()
  }, [user, authLoading, router, pathname])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f7]">
        <div className="text-center">
          <div className="text-[#8e8e93] mb-2">Проверка доступа...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/admin/login')
    return null
  }

  if (error || !adminRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f7] p-4">
        <div className="bg-white rounded-2xl border border-[#e5e5ea] max-w-2xl w-full p-6 text-center">
          <h1 className="text-xl font-bold text-[#1c1c1e] mb-3">Доступ запрещен</h1>
          <div className="text-[#8e8e93] mb-5 whitespace-pre-line text-sm">{error || 'У вас нет прав доступа к админ-панели'}</div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/')} className="px-4 py-2 border border-[#e5e5ea] rounded-lg text-sm font-medium">
              На главную
            </button>
            <button onClick={() => router.push('/admin/login')} className="px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-bold">
              Войти как администратор
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex">
      <AdminSidebar role={adminRole} counts={counts} className="hidden lg:flex fixed inset-y-0 left-0 z-40" />

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Закрыть меню"
            onClick={() => setMobileMenuOpen(false)}
          />
          <AdminSidebar
            role={adminRole}
            counts={counts}
            onNavigate={() => setMobileMenuOpen(false)}
            className="relative z-10 h-full shadow-xl"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 lg:ml-[220px]">
        <AdminHeader onMenuClick={() => setMobileMenuOpen(true)} complaintsNew={counts.complaintsNew} />
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-5 pb-24 lg:pb-5">{children}</main>
      </div>

      <AdminMobileNav counts={counts} onMoreClick={() => setMobileMenuOpen(true)} />
    </div>
  )
}
