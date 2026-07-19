import type { SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { sendSystemChatMessage } from '@/lib/systemChat'

export type UserNotifyPayload = {
  userId: string
  /** Текст в личный чат с администрацией */
  chatText: string
  /** Заголовок push (если подписка есть) */
  pushTitle?: string
  /** Текст push */
  pushBody?: string
  /** URL при клике на push */
  pushUrl?: string
}

function vapidConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  )
}

function configureWebPush() {
  if (!vapidConfigured()) return false
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  return true
}

export async function sendPushToUser(
  admin: SupabaseClient,
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<number> {
  if (!configureWebPush()) return 0

  const { data: rows, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error || !rows?.length) return 0

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/chats',
  })

  let sent = 0
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body
      )
      sent++
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', row.id)
      } else {
        console.warn('[push] send failed', status || e)
      }
    }
  }
  return sent
}

/**
 * Уведомление пользователя: личный чат (+ push при наличии подписки).
 * Email намеренно не используется.
 */
export async function notifyUser(admin: SupabaseClient, payload: UserNotifyPayload): Promise<void> {
  try {
    await sendSystemChatMessage(admin, payload.userId, payload.chatText)
  } catch (e) {
    console.error('[notifyUser] chat', e)
  }

  const title = payload.pushTitle || 'VayMaster'
  const body = payload.pushBody || payload.chatText.slice(0, 120)
  try {
    await sendPushToUser(admin, payload.userId, {
      title,
      body,
      url: payload.pushUrl || '/chats',
    })
  } catch (e) {
    console.error('[notifyUser] push', e)
  }
}
