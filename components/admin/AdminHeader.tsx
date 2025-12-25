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
    <header className="bg-white/80 backdrop-blur-md border-b border-border-color px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">VayMaster Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-sm text-text-secondary">
              {user.full_name || user.email}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <FiLogOut size={18} />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </header>
  )
}
