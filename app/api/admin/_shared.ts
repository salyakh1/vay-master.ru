import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function getSupabaseAdmin() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY не настроен')
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Требует авторизации и роли super_admin или moderator */
export async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { ok: false as const, status: 401, error: 'Не авторизован' }
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: authData, error: authError } = await supabaseClient.auth.getUser()
  if (authError || !authData?.user) {
    return { ok: false as const, status: 401, error: 'Не авторизован' }
  }

  const adminId = authData.user.id

  const { data: adminRole } = await supabaseClient
    .from('admin_roles')
    .select('id')
    .eq('user_id', adminId)
    .eq('is_active', true)
    .in('role', ['super_admin', 'moderator'])
    .maybeSingle()

  if (!adminRole) {
    return { ok: false as const, status: 403, error: 'Требуются права администратора' }
  }

  return { ok: true as const, adminId }
}

/** Требует роли super_admin */
export async function requireSuperAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { ok: false as const, status: 401, error: 'Не авторизован' }
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: authData, error: authError } = await supabaseClient.auth.getUser()
  if (authError || !authData?.user) {
    return { ok: false as const, status: 401, error: 'Не авторизован' }
  }

  const adminId = authData.user.id

  const { data: adminRole } = await supabaseClient
    .from('admin_roles')
    .select('id')
    .eq('user_id', adminId)
    .eq('is_active', true)
    .in('role', ['super_admin'])
    .maybeSingle()

  if (!adminRole) {
    return { ok: false as const, status: 403, error: 'Только супер-администратор' }
  }

  return { ok: true as const, adminId }
}
