import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyUser } from '@/lib/notify'

export const dynamic = 'force-dynamic'

/**
 * Cron: напоминание в личный чат + push за 3 дня до окончания PRO.
 * Защита: заголовок Authorization: Bearer $CRON_SECRET
 * Или ?secret= (для внешних cron).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET не настроен' }, { status: 500 })
  }

  const auth = request.headers.get('authorization')?.replace('Bearer ', '')
  const q = request.nextUrl.searchParams.get('secret')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  if (auth !== secret && q !== secret && !isVercelCron) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const now = new Date()
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const in2days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

  // pro_until между +2 и +3 днями → напоминаем раз в сутки в этом окне
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, pro_until')
    .eq('is_pro', true)
    .not('pro_until', 'is', null)
    .gte('pro_until', in2days.toISOString())
    .lte('pro_until', in3days.toISOString())

  if (error) {
    console.error('[pro-reminders]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let notified = 0
  for (const p of profiles || []) {
    const until = p.pro_until
      ? new Date(p.pro_until as string).toLocaleDateString('ru-RU')
      : ''
    await notifyUser(admin, {
      userId: p.id,
      chatText: `Ваш PRO истекает ${until}.\n\nПродлите подписку, чтобы не потерять приоритет в поиске и доступ к функциям:\nhttps://vay-master.ru/pro`,
      pushTitle: 'PRO скоро закончится',
      pushBody: `Подписка действует до ${until}. Продлите в один клик.`,
      pushUrl: '/pro',
    })
    notified++
  }

  return NextResponse.json({ ok: true, notified, checked: profiles?.length ?? 0 })
}
