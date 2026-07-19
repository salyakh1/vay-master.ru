import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Публичный VAPID-ключ для подписки на Web Push */
export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) {
    return NextResponse.json({ enabled: false, publicKey: null })
  }
  return NextResponse.json({ enabled: true, publicKey: key })
}
