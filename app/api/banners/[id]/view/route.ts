import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 })
    }

    // Вызываем функцию для увеличения счетчика просмотров
    const { error } = await supabase.rpc('increment_banner_views', {
      banner_id: id,
    })

    if (error) {
      console.error('Error incrementing banner views:', error)
      return NextResponse.json({ error: 'Failed to increment views' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in view route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

