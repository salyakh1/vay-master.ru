import { NextRequest, NextResponse } from 'next/server'
import { getBearerUser, getServiceClient } from '@/lib/api-auth'
import { getClientIp, rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { success } = rateLimit(`products-create:${getClientIp(request)}`, 20, 60_000)
  if (!success) return rateLimitResponse()

  const user = await getBearerUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  const admin = getServiceClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'seller') {
    return NextResponse.json({ error: 'Товары может создавать только продавец' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const price = Number(body.price)
  if (!name || !description || !Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'Некорректные данные товара' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('products')
    .insert({
      seller_id: user.id,
      name,
      description,
      price,
      category: body.category || '',
      category_id: body.category_id || null,
      subcategory_id: body.subcategory_id || null,
      in_stock: body.in_stock !== false,
      stock_count: body.stock_count ?? null,
      images: Array.isArray(body.images) ? body.images : [],
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ id: data.id })
}
