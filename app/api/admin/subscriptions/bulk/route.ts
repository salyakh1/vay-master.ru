import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, requireSuperAdmin } from '../_shared'

export const dynamic = 'force-dynamic'

type BulkRole = 'master' | 'seller' | 'both'
type BulkAction = 'grant' | 'revoke'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const action = body.action as BulkAction | undefined
    const role = body.role as BulkRole | undefined
    const days = Number(body.days ?? 0)

    if (!action || !role) {
      return NextResponse.json({ error: 'action и role обязательны' }, { status: 400 })
    }

    if (action === 'grant' && (!Number.isFinite(days) || days <= 0 || days > 3650)) {
      return NextResponse.json({ error: 'days должен быть числом от 1 до 3650' }, { status: 400 })
    }

    const roles = role === 'both' ? ['master', 'seller'] : [role]
    const supabaseAdmin = getSupabaseAdmin()

    // Берём всех целевых пользователей с их текущим pro_until, чтобы корректно "добавлять" дни
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, pro_until')
      .in('role', roles)

    if (fetchError) throw fetchError

    const now = new Date()
    const nowIso = now.toISOString()
    const updates =
      (profiles || []).map((p: any) => {
        if (action === 'revoke') {
          return { id: p.id, is_pro: false, pro_until: nowIso }
        }

        const base = p.pro_until ? new Date(p.pro_until) : now
        const baseTime = Number.isNaN(base.getTime()) ? now.getTime() : Math.max(now.getTime(), base.getTime())
        const newUntil = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString()
        return { id: p.id, is_pro: true, pro_until: newUntil }
      })

    // Upsert по id
    if (updates.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('profiles')
        .upsert(updates, { onConflict: 'id' })
      if (upsertError) throw upsertError
    }

    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: auth.adminId,
      action: action === 'grant' ? 'bulk_grant_pro' : 'bulk_revoke_pro',
      resource_type: 'profiles',
      details: { role, roles, days: action === 'grant' ? days : undefined, affected: updates.length },
    })

    return NextResponse.json({ ok: true, affected: updates.length })
  } catch (e: any) {
    console.error('bulk pro error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

