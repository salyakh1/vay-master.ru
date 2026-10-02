import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServiceClient } from '@/lib/api-auth'
import { iconForCategorySlug, groupChatName } from '@/lib/groupChats'

export const dynamic = 'force-dynamic'

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: authData } = await client.auth.getUser()
  if (!authData?.user) return null
  const { data: role } = await client
    .from('admin_roles')
    .select('id')
    .eq('user_id', authData.user.id)
    .eq('is_active', true)
    .maybeSingle()
  return role ? authData.user.id : null
}

export type CoverageRow = {
  categoryId: string
  categoryName: string
  categorySlug: string
  sortOrder: number
  subcategoryCount: number
  chatId: string | null
  chatName: string | null
  chatActive: boolean
  status: 'ok' | 'inactive' | 'missing'
}

/** GET — покрытие: категория → профчат */
export async function GET(request: NextRequest) {
  const adminId = await requireAdmin(request)
  if (!adminId) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })

  const admin = getServiceClient()

  const [{ data: categories, error: catErr }, { data: chats, error: chatErr }, { data: subs }] = await Promise.all([
    admin.from('categories').select('id, name, slug, sort_order').order('sort_order').order('name'),
    admin.from('group_chats').select('id, name, specialization_id, is_active'),
    admin.from('subcategories').select('id, category_id'),
  ])

  if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 })
  if (chatErr) {
    // Таблицы ещё нет
    return NextResponse.json({
      error: chatErr.message,
      needsMigration: true,
      summary: { categoriesTotal: categories?.length ?? 0, chatsLinked: 0, missing: categories?.length ?? 0, inactive: 0 },
      rows: [],
    })
  }

  const subCount = new Map<string, number>()
  for (const s of subs || []) {
    subCount.set(s.category_id, (subCount.get(s.category_id) || 0) + 1)
  }

  const chatBySpec = new Map<string, { id: string; name: string; is_active: boolean }>()
  for (const c of chats || []) {
    if (!c.specialization_id) continue
    const prev = chatBySpec.get(c.specialization_id)
    // предпочитаем активный
    if (!prev || (!prev.is_active && c.is_active)) {
      chatBySpec.set(c.specialization_id, { id: c.id, name: c.name, is_active: Boolean(c.is_active) })
    }
  }

  const rows: CoverageRow[] = (categories || []).map((cat) => {
    const chat = chatBySpec.get(cat.id)
    let status: CoverageRow['status'] = 'missing'
    if (chat?.is_active) status = 'ok'
    else if (chat) status = 'inactive'
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categorySlug: cat.slug,
      sortOrder: cat.sort_order ?? 0,
      subcategoryCount: subCount.get(cat.id) || 0,
      chatId: chat?.id ?? null,
      chatName: chat?.name ?? null,
      chatActive: Boolean(chat?.is_active),
      status,
    }
  })

  const summary = {
    categoriesTotal: rows.length,
    chatsLinked: rows.filter((r) => r.status === 'ok').length,
    missing: rows.filter((r) => r.status === 'missing').length,
    inactive: rows.filter((r) => r.status === 'inactive').length,
  }

  return NextResponse.json({ summary, rows })
}

/** POST — создать недостающие профчаты / активировать неактивные */
export async function POST(request: NextRequest) {
  const adminId = await requireAdmin(request)
  if (!adminId) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })

  const admin = getServiceClient()
  const { data: categories, error: catErr } = await admin
    .from('categories')
    .select('id, name, slug')
    .order('sort_order')
    .order('name')

  if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 })

  const { data: existing } = await admin.from('group_chats').select('id, specialization_id, is_active')
  const bySpec = new Map((existing || []).filter((c) => c.specialization_id).map((c) => [c.specialization_id as string, c]))

  let created = 0
  let activated = 0
  const errors: string[] = []

  for (const cat of categories || []) {
    const found = bySpec.get(cat.id)
    if (found?.is_active) continue
    if (found && !found.is_active) {
      const { error } = await admin.from('group_chats').update({ is_active: true, name: groupChatName(cat.name) }).eq('id', found.id)
      if (error) errors.push(`${cat.name}: ${error.message}`)
      else activated++
      continue
    }

    const { error } = await admin.from('group_chats').insert({
      name: groupChatName(cat.name),
      icon: iconForCategorySlug(cat.slug),
      description: `Профчат для мастеров: ${cat.name}`,
      city: null,
      specialization_id: cat.id,
      is_active: true,
    })
    if (error) errors.push(`${cat.name}: ${error.message}`)
    else created++
  }

  // Деактивировать чаты без specialization_id (старые сиды)
  await admin.from('group_chats').update({ is_active: false }).is('specialization_id', null).eq('is_active', true)

  return NextResponse.json({ ok: true, created, activated, errors })
}
