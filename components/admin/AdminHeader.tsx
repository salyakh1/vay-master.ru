'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import { FiLogOut } from 'react-icons/fi'

export default function AdminHeader() {
  const { user } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="bg-bg-card border-b border-border-light px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-graphite-secondary tracking-tight">VAY-MASTER Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-sm text-text-secondary font-medium">
              {user.full_name || user.email}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-graphite-secondary transition-colors font-medium"
          >
            <FiLogOut size={18} strokeWidth={2} />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </header>
  )
}
