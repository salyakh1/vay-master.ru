'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AdminNavCounts } from '@/components/admin/adminNavConfig'

const EMPTY: AdminNavCounts = {
  users: 0,
  masters: 0,
  sellers: 0,
  restrictions: 0,
  orders: 0,
  products: 0,
  complaints: 0,
  complaintsNew: 0,
  pro: 0,
  moderation: 0,
}

export function useAdminNavCounts() {
  const [counts, setCounts] = useState<AdminNavCounts>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [
          users,
          masters,
          sellers,
          restrictions,
          orders,
          products,
          complaints,
          complaintsNew,
          pro,
          moderation,
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'master'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller'),
          supabase.from('user_restrictions').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('orders').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('complaints').select('*', { count: 'exact', head: true }),
          supabase.from('complaints').select('*', { count: 'exact', head: true }).in('status', ['new', 'in_review']),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_pro', true),
          supabase.from('content_moderation').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        ])

        if (!active) return
        setCounts({
          users: users.count ?? 0,
          masters: masters.count ?? 0,
          sellers: sellers.count ?? 0,
          restrictions: restrictions.count ?? 0,
          orders: orders.count ?? 0,
          products: products.count ?? 0,
          complaints: complaints.count ?? 0,
          complaintsNew: complaintsNew.count ?? 0,
          pro: pro.count ?? 0,
          moderation: moderation.count ?? 0,
        })
      } catch {
        if (active) setCounts(EMPTY)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  return { counts, loading }
}
