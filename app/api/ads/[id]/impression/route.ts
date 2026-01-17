import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adId = params.id

    if (!adId) {
      return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 })
    }

    // Используем функцию из БД для увеличения счетчика
    const { error } = await supabase.rpc('increment_banner_views', {
      banner_id: adId,
    })

    if (error) {
      console.error('Error incrementing banner views:', error)
      // В supabase-js v2 нет supabase.raw(). Если RPC не доступен — возвращаем ошибку.
      return NextResponse.json({ error: 'Failed to track impression' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in impression API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
