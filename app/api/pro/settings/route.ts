import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY не настроен')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export const dynamic = 'force-dynamic'

async function getBoolSetting(key: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  // value хранится как jsonb (true/false)
  return data?.value === true
}

export async function GET() {
  try {
    const [disableMasterRestrictions, disableSellerRestrictions] = await Promise.all([
      getBoolSetting('pro_disable_master_restrictions'),
      getBoolSetting('pro_disable_seller_restrictions'),
    ])

    return NextResponse.json({
      disableMasterRestrictions,
      disableSellerRestrictions,
    })
  } catch (e) {
    console.error('Error fetching pro settings:', e)
    return NextResponse.json({
      disableMasterRestrictions: false,
      disableSellerRestrictions: false,
    })
  }
}

