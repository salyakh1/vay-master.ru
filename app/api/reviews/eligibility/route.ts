import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hasCompletedDeal, type ReviewTargetType } from '@/lib/review-eligibility'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

/**
 * GET /api/reviews/eligibility?type=master&targetId=...&sellerId=...
 * Authorization: Bearer <jwt>
 * → { canReview: boolean }
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ canReview: false, error: 'Не авторизован' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ canReview: false, error: 'Не авторизован' }, { status: 401 })
    }

    const type = request.nextUrl.searchParams.get('type') as ReviewTargetType | null
    const targetId = request.nextUrl.searchParams.get('targetId')
    const sellerId = request.nextUrl.searchParams.get('sellerId')

    if (!type || !targetId || !['master', 'seller', 'product'].includes(type)) {
      return NextResponse.json({ error: 'type and targetId are required' }, { status: 400 })
    }

    const canReview = await hasCompletedDeal({
      admin: supabaseAdmin,
      reviewerId: user.id,
      targetType: type,
      targetId,
      sellerId,
    })

    return NextResponse.json({ canReview })
  } catch (e: any) {
    console.error('reviews/eligibility', e)
    return NextResponse.json({ canReview: false, error: e?.message || 'Error' }, { status: 500 })
  }
}
