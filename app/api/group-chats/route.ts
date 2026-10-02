import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isProActive } from '@/lib/masterAccess'

export const dynamic = 'force-dynamic'

const COOLDOWN_MS = 12 * 60 * 60 * 1000

function userClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

/** GET /api/group-chats — профчаты для PRO-мастера (макс. 3 по специализациям) */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7).trim()
    const supabase = userClient(token)

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_pro, pro_until, city')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'master' || !isProActive(profile)) {
      return NextResponse.json({ chats: [], isPro: false })
    }

    // Категории мастера через подкатегории (максимум 3)
    const { data: subs } = await supabase
      .from('profile_subcategories')
      .select('subcategory_id, subcategories(category_id)')
      .eq('profile_id', user.id)
      .limit(12)

    const categoryIds = Array.from(
      new Set(
        (subs || [])
          .map((row) => {
            const sub = (row as { subcategories?: { category_id?: string } | { category_id?: string }[] | null })
              .subcategories
            if (Array.isArray(sub)) return sub[0]?.category_id
            return sub?.category_id
          })
          .filter((id): id is string => Boolean(id))
      )
    ).slice(0, 3)

    const { data: chats, error: chatsError } = await supabase
      .from('group_chats')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (chatsError) {
      console.error('group-chats list', chatsError)
      return NextResponse.json({ chats: [], isPro: true, error: chatsError.message }, { status: 200 })
    }

    const city = (profile.city || '').trim().toLowerCase()
    let list = chats || []

    // Приоритет: чаты своей категории; затем без specialization_id; город — мягкий фильтр
    if (categoryIds.length > 0) {
      const matched = list.filter((c) => c.specialization_id && categoryIds.includes(c.specialization_id as string))
      const unlinked = list.filter((c) => !c.specialization_id)
      list = matched.length > 0 ? [...matched, ...unlinked] : [...unlinked, ...list]
    }

    if (city) {
      const byCity = list.filter((c) => !c.city || String(c.city).toLowerCase() === city)
      if (byCity.length > 0) list = byCity
    }

    // Максимум 3 профчата (по числу специализаций)
    list = list.slice(0, 3)

    if (list.length === 0) {
      return NextResponse.json({ chats: [], isPro: true, noSpecs: categoryIds.length === 0 })
    }

    const chatIds = list.map((c) => c.id)
    const { data: cooldowns } = await supabase
      .from('group_message_cooldowns')
      .select('chat_id, last_message_at')
      .eq('user_id', user.id)
      .in('chat_id', chatIds)

    const cooldownMap = new Map((cooldowns || []).map((c) => [c.chat_id, c.last_message_at as string]))

    // Последнее живое сообщение для превью
    const { data: lastMsgs } = await supabase
      .from('group_messages')
      .select('chat_id, content, created_at, sender_id, profiles!group_messages_sender_id_fkey(full_name)')
      .in('chat_id', chatIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    const previewMap = new Map<string, { content: string; senderName: string; created_at: string }>()
    for (const m of lastMsgs || []) {
      if (previewMap.has(m.chat_id)) continue
      const profiles = m.profiles as { full_name?: string } | { full_name?: string }[] | null
      const name = Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name
      previewMap.set(m.chat_id, {
        content: m.content as string,
        senderName: name || 'Мастер',
        created_at: m.created_at as string,
      })
    }

    const now = Date.now()
    const chatsWithCooldown = list.map((chat) => {
      const lastMsg = cooldownMap.get(chat.id)
      const canWrite = !lastMsg || new Date(lastMsg).getTime() + COOLDOWN_MS < now
      const nextAvailable = lastMsg ? new Date(new Date(lastMsg).getTime() + COOLDOWN_MS).toISOString() : null
      const preview = previewMap.get(chat.id) || null
      return {
        ...chat,
        canWrite,
        nextAvailable,
        lastMessageAt: lastMsg ?? null,
        lastPreview: preview,
      }
    })

    return NextResponse.json({ chats: chatsWithCooldown, isPro: true, noSpecs: categoryIds.length === 0 })
  } catch (e) {
    console.error('group-chats GET', e)
    return NextResponse.json({ chats: [], isPro: false }, { status: 500 })
  }
}
