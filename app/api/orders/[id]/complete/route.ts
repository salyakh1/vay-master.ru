import { NextRequest, NextResponse } from 'next/server'
import { getBearerUser, getServiceClient } from '@/lib/api-auth'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { sendPushToUser } from '@/lib/notify'

export const dynamic = 'force-dynamic'

/**
 * POST /api/orders/[id]/complete
 * Двустороннее завершение: первая сторона запрашивает, вторая подтверждает → completed.
 * Идемпотентно для уже completed и повторного запроса той же стороны.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { success } = rateLimit(`complete:${getClientIp(request)}`, 20, 60_000)
  if (!success) return rateLimitResponse()

  const user = await getBearerUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const orderId = params.id
  const admin = getServiceClient()

  const { data, error } = await admin.rpc('request_order_complete', {
    p_order_id: orderId,
    p_user_id: user.id,
  })

  if (error) {
    console.error('request_order_complete', error)
    return NextResponse.json(
      { error: 'Не удалось завершить заказ. Проверьте SQL complete_loop_and_review_rls.sql' },
      { status: 500 }
    )
  }

  const result = data as {
    ok?: boolean
    error?: string
    status?: string
    waiting?: boolean
    already?: boolean
  }

  if (!result?.ok) {
    if (result?.error === 'not_found') {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })
    }
    if (result?.error === 'forbidden') {
      return NextResponse.json({ error: 'Только стороны сделки могут завершить заказ' }, { status: 403 })
    }
    if (result?.error === 'not_in_progress') {
      return NextResponse.json(
        { error: 'Завершить можно только заказ в работе', status: result.status },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Нельзя завершить заказ' }, { status: 400 })
  }

  try {
    const { data: order } = await admin
      .from('orders')
      .select('id, client_id, selected_master_id, title, status, complete_requested_by')
      .eq('id', orderId)
      .maybeSingle()
    if (order) {
      const otherId =
        user.id === order.client_id ? order.selected_master_id : order.client_id
      if (otherId && result.status === 'in_progress' && result.waiting) {
        await sendPushToUser(admin, otherId, {
          title: 'Работа выполнена?',
          body: 'Подтвердите завершение заказа',
          url: `/orders/${orderId}`,
        })
      }
      if (result.status === 'completed' && !result.already) {
        const ids = [order.client_id, order.selected_master_id].filter(Boolean) as string[]
        for (const id of ids) {
          await sendPushToUser(admin, id, {
            title: 'Заказ выполнен',
            body: 'Можно оставить отзыв',
            url: `/orders/${orderId}`,
          })
        }
      }
      await admin.from('funnel_events').insert({
        name: result.status === 'completed' ? 'complete' : 'complete_requested',
        user_id: user.id,
        properties: { orderId, status: result.status },
      })
    }
  } catch (e) {
    console.warn('complete notify/track', e)
  }

  return NextResponse.json({
    status: result.status,
    waiting: !!result.waiting,
    already: !!result.already,
  })
}
