import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Централизованный gate для /api/admin/* и /admin/*.
 * Детальные права (super_admin vs moderator) остаются в requireAdmin / requireSuperAdmin.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Страницы /admin/* — layout проверяет роль на клиенте; здесь только API.
  if (!pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Auth не настроен' }, { status: 500 })
  }

  const token = authHeader.slice(7)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const { data: adminRole } = await supabase
    .from('admin_roles')
    .select('id')
    .eq('user_id', authData.user.id)
    .eq('is_active', true)
    .in('role', ['super_admin', 'moderator'])
    .maybeSingle()

  if (!adminRole) {
    return NextResponse.json({ error: 'Требуются права администратора' }, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/admin/:path*'],
}
