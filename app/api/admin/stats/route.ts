import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type Period = 'day' | 'week' | 'month'

function periodFrom(period: Period): Date {
  const now = new Date()
  const from = new Date(now)
  if (period === 'day') from.setDate(now.getDate() - 1)
  else if (period === 'week') from.setDate(now.getDate() - 7)
  else from.setMonth(now.getMonth() - 1)
  return from
}

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: authData } = await client.auth.getUser()
  if (!authData?.user) return null

  const { data: role } = await client
    .from('admin_roles')
    .select('id')
    .eq('user_id', authData.user.id)
    .eq('is_active', true)
    .maybeSingle()

  return role ? authData.user.id : null
}

export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request)
    if (!adminId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    const periodParam = (request.nextUrl.searchParams.get('period') || 'month') as Period
    const period: Period = ['day', 'week', 'month'].includes(periodParam) ? periodParam : 'month'
    const fromISO = periodFrom(period).toISOString()

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const [
      { count: totalUsers },
      { count: totalOrders },
      { count: totalMasters },
      { count: totalSellers },
      { count: totalPro },
      { count: newUsers },
      { count: newOrders },
      { count: newProducts },
      { count: newMessages },
      { count: newComplaints },
      { data: paidSessions },
      { count: newProPayments },
    ] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('orders').select('*', { count: 'exact', head: true }),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'master'),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'seller'),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_pro', true),
      admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', fromISO),
      admin.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', fromISO),
      admin.from('products').select('*', { count: 'exact', head: true }).gte('created_at', fromISO),
      admin.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', fromISO),
      admin.from('complaints').select('*', { count: 'exact', head: true }).gte('created_at', fromISO),
      admin
        .from('payment_sessions')
        .select('amount_kopecks, kind')
        .eq('status', 'paid')
        .gte('created_at', fromISO),
      admin
        .from('payment_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid')
        .eq('kind', 'pro_subscription')
        .gte('created_at', fromISO),
    ])

    const revenueKopecks = (paidSessions || []).reduce(
      (sum, s) => sum + (typeof s.amount_kopecks === 'number' ? s.amount_kopecks : 0),
      0
    )
    const proRevenueKopecks = (paidSessions || [])
      .filter((s) => s.kind === 'pro_subscription')
      .reduce((sum, s) => sum + (typeof s.amount_kopecks === 'number' ? s.amount_kopecks : 0), 0)

    const masters = totalMasters ?? 0
    const proConversion =
      masters > 0 ? Math.round(((totalPro ?? 0) / masters) * 1000) / 10 : 0

    return NextResponse.json({
      period,
      from: fromISO,
      total: {
        users: totalUsers ?? 0,
        orders: totalOrders ?? 0,
        masters,
        sellers: totalSellers ?? 0,
        pro: totalPro ?? 0,
      },
      period_stats: {
        new_users: newUsers ?? 0,
        new_orders: newOrders ?? 0,
        new_products: newProducts ?? 0,
        new_messages: newMessages ?? 0,
        new_complaints: newComplaints ?? 0,
        new_pro_payments: newProPayments ?? 0,
      },
      revenue_rub: Math.round(revenueKopecks / 100),
      pro_revenue_rub: Math.round(proRevenueKopecks / 100),
      pro_conversion_pct: proConversion,
    })
  } catch (e: unknown) {
    console.error('[admin/stats]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Ошибка' },
      { status: 500 }
    )
  }
}
