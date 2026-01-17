import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const dynamic = 'force-dynamic'

// POST - Отметить историю как просмотренную
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { viewerId } = body

    if (!viewerId) {
      return NextResponse.json({ error: 'viewerId is required' }, { status: 400 })
    }

    const storyId = params.id

    // Проверяем, не просмотрена ли уже история
    const { data: existingView } = await supabase
      .from('story_views')
      .select('id')
      .eq('story_id', storyId)
      .eq('viewer_id', viewerId)
      .maybeSingle()

    if (existingView) {
      // Уже просмотрена
      return NextResponse.json({ viewed: true })
    }

    // Создаем просмотр
    const { error } = await supabaseAdmin
      .from('story_views')
      .insert({
        story_id: storyId,
        viewer_id: viewerId,
      })

    if (error) {
      // Если ошибка из-за уникальности - значит уже просмотрена
      if (error.code === '23505') {
        return NextResponse.json({ viewed: true })
      }
      throw error
    }

    return NextResponse.json({ viewed: true })
  } catch (error: any) {
    console.error('Error marking story as viewed:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
