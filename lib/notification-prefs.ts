export type NotificationPrefKey =
  | 'new_orders'
  | 'chat_messages'
  | 'new_reviews'
  | 'promotions'
  | 'order_responses'
  | 'buyer_messages'
  | 'product_reviews'

export type NotificationPrefs = Partial<Record<NotificationPrefKey, boolean>>

const STORAGE_KEY = 'vay-notification-prefs'

const DEFAULTS: Record<string, NotificationPrefs> = {
  master: {
    new_orders: true,
    chat_messages: true,
    new_reviews: false,
    promotions: false,
  },
  seller: {
    buyer_messages: true,
    product_reviews: true,
    promotions: false,
  },
  client: {
    order_responses: true,
    chat_messages: true,
    promotions: false,
  },
}

function readAll(): Record<string, NotificationPrefs> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, NotificationPrefs>) : {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, NotificationPrefs>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getNotificationPrefs(userId: string, role: string): NotificationPrefs {
  const stored = readAll()[userId]
  const defaults = DEFAULTS[role] ?? DEFAULTS.client
  return { ...defaults, ...stored }
}

export function setNotificationPref(
  userId: string,
  role: string,
  key: NotificationPrefKey,
  value: boolean
): NotificationPrefs {
  const all = readAll()
  const current = { ...(DEFAULTS[role] ?? DEFAULTS.client), ...all[userId] }
  current[key] = value
  all[userId] = current
  writeAll(all)
  return current
}
