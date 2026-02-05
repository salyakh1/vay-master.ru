import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 })
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

    // Проверяем текущего пользователя
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Проверяем, что email совпадает
    if (user.email !== email) {
      return NextResponse.json({ error: 'Email не совпадает с вашим аккаунтом' }, { status: 400 })
    }

    // Проверяем пароль, пытаясь войти
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 })
    }

    if (!supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY не настроен. Добавьте его в .env.local и перезапустите сервер.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Удаляем все связанные данные пользователя
    const userId = user.id

    // Используем supabaseAdmin для всех операций удаления, чтобы обойти RLS

    // Удаляем portfolio items
    const { data: portfolioItems } = await supabaseAdmin
      .from('portfolio_items')
      .select('id')
      .eq('master_id', userId)
    
    if (portfolioItems && portfolioItems.length > 0) {
      const portfolioIds = portfolioItems.map((item) => item.id)
      await supabaseAdmin.from('portfolio_likes').delete().in('item_id', portfolioIds)
      await supabaseAdmin.from('portfolio_comments').delete().in('item_id', portfolioIds)
      await supabaseAdmin.from('portfolio_items').delete().eq('master_id', userId)
    }

    // Удаляем товары
    await supabaseAdmin.from('products').delete().eq('seller_id', userId)

    // Удаляем заказы и ответы
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('client_id', userId)
    
    if (orders && orders.length > 0) {
      const orderIds = orders.map((order) => order.id)
      await supabaseAdmin.from('order_responses').delete().in('order_id', orderIds)
      await supabaseAdmin.from('orders').delete().eq('client_id', userId)
    }

    await supabaseAdmin.from('order_responses').delete().eq('master_id', userId)

    // Удаляем чаты и сообщения
    const { data: chats } = await supabaseAdmin
      .from('chats')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    
    if (chats && chats.length > 0) {
      const chatIds = chats.map((chat) => chat.id)
      await supabaseAdmin.from('messages').delete().in('chat_id', chatIds)
      await supabaseAdmin.from('chats').delete().in('id', chatIds)
    }

    // Удаляем посты и лайки
    const { data: posts } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('user_id', userId)
    
    if (posts && posts.length > 0) {
      const postIds = posts.map((post) => post.id)
      await supabaseAdmin.from('post_likes').delete().in('post_id', postIds)
      await supabaseAdmin.from('posts').delete().eq('user_id', userId)
    }

    // Удаляем подписки
    await supabaseAdmin.from('follows').delete().eq('follower_id', userId)
    await supabaseAdmin.from('follows').delete().eq('following_id', userId)

    // Удаляем подкатегории, услуги профиля (категории → подкатегории → услуги)
    await supabaseAdmin.from('profile_subcategories').delete().eq('profile_id', userId)
    await supabaseAdmin.from('profile_services').delete().eq('profile_id', userId)

    // Удаляем admin roles если есть
    await supabaseAdmin.from('admin_roles').delete().eq('user_id', userId)

    // Удаляем user restrictions если есть
    await supabaseAdmin.from('user_restrictions').delete().eq('user_id', userId)

    // Удаляем жалобы если есть
    await supabaseAdmin.from('complaints').delete().eq('complainer_id', userId)
    await supabaseAdmin.from('complaints').delete().eq('reported_user_id', userId)

    // Удаляем профиль
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // Удаляем из auth.users через Admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting user from auth.users:', deleteError)
      return NextResponse.json(
        { error: `Ошибка при удалении аккаунта: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Аккаунт успешно удален' })
  } catch (error: any) {
    console.error('Error in delete account API:', error)
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

