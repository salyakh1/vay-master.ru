import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, requireSuperAdmin, upsertBoolSetting } from '../_shared'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json().catch(() => ({}))
    const disableMasterRestrictions = !!body.disableMasterRestrictions
    const disableSellerRestrictions = !!body.disableSellerRestrictions

    const supabaseAdmin = getSupabaseAdmin()

    await upsertBoolSetting(
      supabaseAdmin,
      'pro_disable_master_restrictions',
      disableMasterRestrictions,
      auth.adminId
    )
    await upsertBoolSetting(
      supabaseAdmin,
      'pro_disable_seller_restrictions',
      disableSellerRestrictions,
      auth.adminId
    )

    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id: auth.adminId,
      action: 'update_pro_feature_flags',
      resource_type: 'system_settings',
      details: { disableMasterRestrictions, disableSellerRestrictions },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('flags update error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}

