import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// Читаем Service Role Key - он должен быть в .env.local
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    // Проверяем переменные окружения сразу
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    console.log('[DELETE-USER API] Service key check:', {
      exists: !!serviceKey,
      length: serviceKey?.length || 0,
      firstChars: serviceKey?.substring(0, 30) || 'N/A'
    })

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId обязателен' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // Проверяем, что пользователь - администратор
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем права администратора
    const { data: adminRole } = await supabaseClient
      .from('admin_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role', ['super_admin'])
      .maybeSingle()

    if (!adminRole) {
      return NextResponse.json({ error: 'Только супер-администратор может удалять пользователей из auth.users' }, { status: 403 })
    }

    // Используем Service Role Key для удаления из auth.users
    console.log('Checking SUPABASE_SERVICE_ROLE_KEY:', {
      exists: !!supabaseServiceRoleKey,
      length: supabaseServiceRoleKey?.length || 0,
      startsWith: supabaseServiceRoleKey?.substring(0, 20) || 'N/A'
    })

    if (!supabaseServiceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is missing. Available env vars:', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasServiceKey: !!supabaseServiceRoleKey,
        envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      })
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY не настроен. Добавьте его в переменные окружения и перезапустите сервер.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log('Attempting to delete user from auth.users:', userId)
    
    // Удаляем пользователя из auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    console.log('Delete result:', { deleteError: deleteError?.message || 'Success' })

    if (deleteError) {
      console.error('Error deleting user from auth.users:', deleteError)
      return NextResponse.json(
        { error: `Ошибка при удалении пользователя из auth.users: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Пользователь полностью удален из системы' })
  } catch (error: any) {
    console.error('Error in delete-user API:', error)
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

