import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, requireSuperAdmin } from '../_shared'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const userId = body.userId as string | undefined

    if (!userId) return NextResponse.json({ error: 'userId обязателен' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()
    const now = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_pro: false,
        pro_until: now,
      })
      .eq('id', userId)

    if (updateError) throw updateError

    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: auth.adminId,
      action: 'revoke_pro',
      resource_type: 'profile',
      resource_id: userId,
      details: { pro_until: now },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('revoke pro error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

