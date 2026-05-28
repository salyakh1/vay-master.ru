'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '../providers'
import { isAdmin, getAdminRole, type AdminRole } from '@/lib/admin'
import { createLogger } from '@/lib/logger'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

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

  useEffect(() => {
    // Если мы на странице входа, пропускаем все проверки
    if (pathname === '/admin/login') {
      setChecking(false)
      return
    }

    async function checkAdminAccess() {
      if (authLoading) {
        return
      }

      if (!user) {
        // Перенаправляем на страницу входа в админ-панель
        router.push('/admin/login')
        setChecking(false)
        return
      }

      logger.debug('Checking admin status for user', user.id)
      try {
        const isUserAdmin = await isAdmin(user.id)
        logger.debug('isAdmin result', isUserAdmin)

        if (!isUserAdmin) {
          logger.debug('User is not admin')
          setError(`У пользователя ${user.id} нет прав администратора.\n\nВыполните SQL скрипт supabase/assign_admin_current_user.sql в Supabase SQL Editor.`)
          setChecking(false)
          return
        }

        const role = await getAdminRole(user.id)
        logger.debug('Admin role', role)

        if (!role) {
          logger.debug('No admin role found')
          setError(`Роль администратора не найдена для пользователя ${user.id}`)
          setChecking(false)
          return
        }
        
        logger.debug('Admin access granted', role)
        setAdminRole(role)
        setChecking(false)
        setError(null)
      } catch (err) {
        console.error('Error in admin check:', err)
        setError(`Ошибка при проверке прав: ${err instanceof Error ? err.message : String(err)}`)
        setChecking(false)
      }
    }

    checkAdminAccess()
  }, [user, authLoading, router, pathname])

  // Если мы на странице входа, не применяем layout
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="text-text-secondary mb-4">Проверка доступа...</div>
          {user && (
            <div className="text-xs text-text-muted">
              Пользователь: {user.id}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!user) {
    router.push('/admin/login')
    return null
  }

  // Если пользователь авторизован, но не является администратором
  if (error || !adminRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
        <div className="card max-w-2xl text-center">
          <h1 className="text-2xl font-semibold text-text-primary mb-4">Доступ запрещен</h1>
          <div className="text-text-secondary mb-6 whitespace-pre-line">
            {error || 'У вас нет прав доступа к админ-панели'}
          </div>
          {user && (
            <div className="text-sm text-text-muted mb-4 p-4 bg-bg-secondary rounded">
              <div>ID пользователя: {user.id}</div>
              <div>Email: {user.email}</div>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/')}
              className="btn btn-outline"
            >
              На главную
            </button>
            <button
              onClick={() => router.push('/admin/login')}
              className="btn btn-primary"
            >
              Войти как администратор
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <AdminSidebar role={adminRole} currentPath={pathname || ''} />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

