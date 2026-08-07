import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type ReviewTargetType = 'master' | 'seller' | 'product'

/**
 * Отзыв разрешён только после завершённого заказа между клиентом и исполнителем.
 * Для product — завершённый заказ с selected_master_id = seller товара.
 */
export async function hasCompletedDeal(params: {
  admin: SupabaseClient
  reviewerId: string
  targetType: ReviewTargetType
  targetId: string
  sellerId?: string | null
}): Promise<boolean> {
  const { admin, reviewerId, targetType, targetId, sellerId } = params

  if (targetType === 'master' || targetType === 'seller') {
    const { data, error } = await admin
      .from('orders')
      .select('id')
      .eq('client_id', reviewerId)
      .eq('selected_master_id', targetId)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('hasCompletedDeal master/seller', error)
      return false
    }
    return !!data
  }

  if (targetType === 'product') {
    let seller = sellerId
    if (!seller) {
      const { data: product } = await admin
        .from('products')
        .select('seller_id')
        .eq('id', targetId)
        .maybeSingle()
      seller = product?.seller_id || null
    }
    if (!seller) return false

    const { data, error } = await admin
      .from('orders')
      .select('id')
      .eq('client_id', reviewerId)
      .eq('selected_master_id', seller)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('hasCompletedDeal product', error)
      return false
    }
    return !!data
  }

  return false
}

export function createReviewsAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
