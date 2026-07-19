import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, requireSuperAdmin } from '../_shared'
import { notifyUser } from '@/lib/notify'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const userId = body.userId as string | undefined
    const days = Number(body.days ?? 0)

    if (!userId) return NextResponse.json({ error: 'userId обязателен' }, { status: 400 })
    if (!Number.isFinite(days) || days <= 0 || days > 3650) {
      return NextResponse.json({ error: 'days должен быть числом от 1 до 3650' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, pro_until, is_pro')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 })

    const now = new Date()
    const base = profile.pro_until ? new Date(profile.pro_until as any) : now
    const baseTime = Number.isNaN(base.getTime()) ? now.getTime() : Math.max(now.getTime(), base.getTime())
    const newUntil = new Date(baseTime + days * 24 * 60 * 60 * 1000)

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_pro: true,
        pro_until: newUntil.toISOString(),
      })
      .eq('id', userId)

    if (updateError) throw updateError

    // Audit log
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: auth.adminId,
      action: 'grant_pro',
      resource_type: 'profile',
      resource_id: userId,
      details: { days, pro_until: newUntil.toISOString() },
    })

    const untilLabel = newUntil.toLocaleDateString('ru-RU')
    await notifyUser(supabaseAdmin, {
      userId,
      chatText: `Вам выдан PRO ✅\n\nПодписка активна до ${untilLabel} (+${days} дн.).`,
      pushTitle: 'PRO активирован',
      pushBody: `Действует до ${untilLabel}`,
      pushUrl: '/pro',
    })

    return NextResponse.json({ ok: true, pro_until: newUntil.toISOString() })
  } catch (e: any) {
    console.error('grant pro error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

