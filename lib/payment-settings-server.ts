import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

export type PaymentOrderSettings = {
  paymentOrderPublicationEnabled: boolean
  orderPublicationPriceRub: number
  paymentTinkoffEnabled: boolean
  paymentSbpEnabled: boolean
  /** true если в .env заданы ключи терминала */
  tinkoffEnvConfigured: boolean
  /** Активный провайдер для оплаты заказов (секреты всегда в .env) */
  orderPaymentProvider: string
}

export type ProPaymentSettings = {
  paymentProPurchaseEnabled: boolean
  proSubscriptionPriceRub: number
  proSubscriptionDays: number
  paymentTinkoffEnabled: boolean
  paymentSbpEnabled: boolean
  tinkoffEnvConfigured: boolean
  /** Активный провайдер для оплаты PRO (секреты всегда в .env) */
  proPaymentProvider: string
}

function getAdmin(): ReturnType<typeof createClient> | null {
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function getPaymentOrderSettings(): Promise<PaymentOrderSettings> {
  const defaults: PaymentOrderSettings = {
    paymentOrderPublicationEnabled: true,
    orderPublicationPriceRub: 200,
    paymentTinkoffEnabled: false,
    paymentSbpEnabled: true,
    tinkoffEnvConfigured: Boolean(
      process.env.TINKOFF_TERMINAL_KEY && process.env.TINKOFF_PASSWORD
    ),
    orderPaymentProvider: 'tinkoff',
  }

  const admin = getAdmin()
  if (!admin) return defaults

  const keys = [
    'payment_order_publication_enabled',
    'order_publication_price_rub',
    'payment_tinkoff_enabled',
    'payment_sbp_enabled',
    'payment_order_provider',
  ] as const

  const { data } = await admin.from('system_settings').select('key, value').in('key', [...keys])

  const map = new Map<string, unknown>()
  for (const row of (data || []) as { key: string; value: unknown }[]) {
    map.set(row.key, row.value)
  }

  const bool = (k: string, def: boolean) => {
    const v = map.get(k)
    if (v === true) return true
    if (v === false) return false
    if (typeof v === 'string') return v === 'true'
    return def
  }

  const num = (k: string, def: number) => {
    const v = map.get(k)
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    if (typeof v === 'string') {
      const n = parseFloat(v.replace(',', '.'))
      if (!Number.isNaN(n)) return n
    }
    return def
  }

  const str = (k: string, def: string) => {
    const v = map.get(k)
    if (typeof v === 'string' && v.trim()) return v.trim()
    return def
  }

  return {
    paymentOrderPublicationEnabled: bool('payment_order_publication_enabled', defaults.paymentOrderPublicationEnabled),
    orderPublicationPriceRub: Math.max(0, Math.round(num('order_publication_price_rub', defaults.orderPublicationPriceRub))),
    paymentTinkoffEnabled: bool('payment_tinkoff_enabled', false),
    paymentSbpEnabled: bool('payment_sbp_enabled', true),
    tinkoffEnvConfigured: defaults.tinkoffEnvConfigured,
    orderPaymentProvider: str('payment_order_provider', defaults.orderPaymentProvider),
  }
}

const proDefaults: Omit<ProPaymentSettings, 'tinkoffEnvConfigured'> & { tinkoffEnvConfigured?: boolean } = {
  paymentProPurchaseEnabled: true,
  proSubscriptionPriceRub: 990,
  proSubscriptionDays: 30,
  paymentTinkoffEnabled: false,
  paymentSbpEnabled: true,
  proPaymentProvider: 'tinkoff',
}

export async function getProPaymentSettings(): Promise<ProPaymentSettings> {
  const tinkoffEnvConfigured = Boolean(
    process.env.TINKOFF_TERMINAL_KEY && process.env.TINKOFF_PASSWORD
  )

  const defaults: ProPaymentSettings = {
    ...proDefaults,
    tinkoffEnvConfigured,
  }

  const admin = getAdmin()
  if (!admin) return defaults

  const keys = [
    'payment_pro_purchase_enabled',
    'pro_subscription_price_rub',
    'pro_subscription_days',
    'payment_tinkoff_enabled',
    'payment_sbp_enabled',
    'payment_pro_provider',
  ] as const

  const { data } = await admin.from('system_settings').select('key, value').in('key', [...keys])

  const map = new Map<string, unknown>()
  for (const row of (data || []) as { key: string; value: unknown }[]) {
    map.set(row.key, row.value)
  }

  const bool = (k: string, def: boolean) => {
    const v = map.get(k)
    if (v === true) return true
    if (v === false) return false
    if (typeof v === 'string') return v === 'true'
    return def
  }

  const num = (k: string, def: number) => {
    const v = map.get(k)
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    if (typeof v === 'string') {
      const n = parseFloat(v.replace(',', '.'))
      if (!Number.isNaN(n)) return n
    }
    return def
  }

  const str = (k: string, def: string) => {
    const v = map.get(k)
    if (typeof v === 'string' && v.trim()) return v.trim()
    return def
  }

  const days = Math.round(num('pro_subscription_days', proDefaults.proSubscriptionDays))
  const clampedDays = Math.min(3650, Math.max(1, days))

  return {
    paymentProPurchaseEnabled: bool('payment_pro_purchase_enabled', proDefaults.paymentProPurchaseEnabled),
    proSubscriptionPriceRub: Math.max(0, Math.round(num('pro_subscription_price_rub', proDefaults.proSubscriptionPriceRub))),
    proSubscriptionDays: clampedDays,
    paymentTinkoffEnabled: bool('payment_tinkoff_enabled', false),
    paymentSbpEnabled: bool('payment_sbp_enabled', true),
    tinkoffEnvConfigured,
    proPaymentProvider: str('payment_pro_provider', proDefaults.proPaymentProvider),
  }
}
