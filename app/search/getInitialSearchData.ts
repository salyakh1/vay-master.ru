import { createClient } from '@supabase/supabase-js'
import type { MasterScrollerItem } from '@/lib/scrollerApi'
import { LIST_PAGE_SIZE } from '@/lib/scrollerApi'
import type { Product } from '@/lib/supabase'

function serverSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

/** Первая страница мастеров для SSR /search (без гео — гео догрузит клиент). */
export async function getInitialMastersForSearch(opts?: {
  q?: string
  category?: string
}): Promise<{ items: MasterScrollerItem[]; total: number }> {
  try {
    const supabase = serverSupabase()
    const limit = LIST_PAGE_SIZE
    let query = supabase
      .from('profiles')
      .select(
        'id, full_name, avatar_url, role, city, specialization, description, is_pro, pro_until, master_rating, master_reviews_count, phone, master_lat, master_lng, profile_subcategories(subcategory:subcategories(name))',
        { count: 'exact' }
      )
      .eq('role', 'master')
      .order('master_rating', { ascending: false, nullsFirst: false })
      .range(0, limit - 1)

    if (opts?.q?.trim()) {
      const q = opts.q.trim()
      query = query.or(`full_name.ilike.%${q}%,description.ilike.%${q}%`)
    }

    const { data, count, error } = await query
    if (error) {
      console.error('getInitialMastersForSearch', error)
      return { items: [], total: 0 }
    }
    return {
      items: (data || []) as unknown as MasterScrollerItem[],
      total: count ?? (data?.length || 0),
    }
  } catch (e) {
    console.error('getInitialMastersForSearch', e)
    return { items: [], total: 0 }
  }
}

/** Первая страница товаров для SSR /products. */
export async function getInitialProductsForCatalog(opts?: {
  q?: string
  category?: string
}): Promise<{ items: Product[]; total: number }> {
  try {
    const supabase = serverSupabase()
    const limit = LIST_PAGE_SIZE
    let query = supabase
      .from('products')
      .select(
        '*, seller:profiles!seller_id(id, full_name, avatar_url, role, city)',
        { count: 'exact' }
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(0, limit - 1)

    if (opts?.q?.trim()) {
      const q = opts.q.trim()
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    }
    if (opts?.category) {
      query = query.eq('category_id', opts.category)
    }

    const { data, count, error } = await query
    if (error) {
      console.error('getInitialProductsForCatalog', error)
      return { items: [], total: 0 }
    }
    return {
      items: (data || []) as Product[],
      total: count ?? (data?.length || 0),
    }
  } catch (e) {
    console.error('getInitialProductsForCatalog', e)
    return { items: [], total: 0 }
  }
}
