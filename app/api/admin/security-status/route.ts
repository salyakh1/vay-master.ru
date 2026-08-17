import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getSupabaseAdmin } from '@/app/api/admin/_shared'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/security-status
 * Проверяет, применены ли критические SQL на живой БД.
 */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  const admin = getSupabaseAdmin()
  const checks: Array<{ id: string; ok: boolean; detail: string }> = []

  async function probe(id: string, fn: () => Promise<{ ok: boolean; detail: string }>) {
    try {
      checks.push({ id, ...(await fn()) })
    } catch (e) {
      checks.push({ id, ok: false, detail: e instanceof Error ? e.message : 'error' })
    }
  }

  await probe('complete_loop_sql', async () => {
    const { error } = await admin.from('orders').select('complete_requested_by').limit(1)
    if (error?.message?.includes('complete_requested_by') || error?.code === '42703') {
      return {
        ok: false,
        detail: 'Колонка complete_requested_by отсутствует — прогоните complete_loop_and_review_rls.sql',
      }
    }
    if (error) return { ok: false, detail: error.message }
    return { ok: true, detail: 'complete_requested_by есть' }
  })

  await probe('reviews_rls_helper', async () => {
    const { error } = await admin.rpc('has_completed_deal_with', {
      p_reviewer: '00000000-0000-0000-0000-000000000000',
      p_reviewee: '00000000-0000-0000-0000-000000000000',
    })
    if (error) {
      return {
        ok: false,
        detail: 'Функция has_completed_deal_with не найдена — прогоните complete_loop_and_review_rls.sql',
      }
    }
    return { ok: true, detail: 'has_completed_deal_with доступна' }
  })

  await probe('billing_trigger_fn', async () => {
    const { error } = await admin.from('payment_sessions').select('tinkoff_payment_id').limit(1)
    if (error) {
      return { ok: false, detail: 'Нет payment_sessions.tinkoff_payment_id — прогоните payment_sessions.sql и backend_security_critical.sql' }
    }
    return { ok: true, detail: 'payment_sessions.tinkoff_payment_id есть (unique index задаётся в backend_security_critical.sql)' }
  })

  await probe('payment_sessions', async () => {
    const { error } = await admin.from('payment_sessions').select('id').limit(1)
    if (error) return { ok: false, detail: 'Нет payment_sessions — прогоните payment_sessions.sql' }
    return { ok: true, detail: 'payment_sessions есть' }
  })

  const allOk = checks.every((c) => c.ok)
  return NextResponse.json({
    ok: allOk,
    checks,
    runInSupabase: [
      'payment_sessions.sql',
      'backend_security_critical.sql',
      'complete_loop_and_review_rls.sql',
      'profile_services_price.sql',
      'funnel_events.sql',
    ],
  })
}
