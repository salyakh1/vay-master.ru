import crypto from 'crypto'

const INIT_URL = 'https://securepay.tinkoff.ru/v2/Init'

/** Токен для запросов Tinkoff: SHA-256 от конкатенации значений (без Token) + Password */
export function tinkoffGenerateToken(
  params: Record<string, string | number | boolean | undefined | null>,
  password: string
): string {
  const filtered: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (k === 'Token' || v === undefined || v === null) continue
    if (typeof v === 'object') continue
    filtered[k] = String(v)
  }
  const keys = Object.keys(filtered).sort()
  const str = keys.map((k) => filtered[k]).join('') + password
  return crypto.createHash('sha256').update(str).digest('hex')
}

export interface TinkoffInitParams {
  terminalKey: string
  password: string
  amountKopecks: number
  orderId: string
  description: string
  successUrl: string
  failUrl: string
  notificationUrl: string
  /** СБП и др. — опционально JSON-строка DATA */
  data?: string
}

export interface TinkoffInitResult {
  success: boolean
  paymentId?: string
  paymentURL?: string
  error?: string
  raw?: unknown
}

export async function tinkoffInit(params: TinkoffInitParams): Promise<TinkoffInitResult> {
  const body: Record<string, string | number> = {
    TerminalKey: params.terminalKey,
    Amount: params.amountKopecks,
    OrderId: params.orderId,
    Description: params.description.slice(0, 140),
    SuccessURL: params.successUrl,
    FailURL: params.failUrl,
    NotificationURL: params.notificationUrl,
  }
  if (params.data) {
    body.DATA = params.data
  }

  const token = tinkoffGenerateToken(body as Record<string, string | number>, params.password)
  const payload = { ...body, Token: token }

  const res = await fetch(INIT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const json = (await res.json()) as {
    Success?: boolean
    ErrorCode?: string
    Message?: string
    PaymentId?: string
    PaymentURL?: string
    Details?: string
  }

  if (!json.Success) {
    return {
      success: false,
      error: json.Message || json.Details || json.ErrorCode || 'Init failed',
      raw: json,
    }
  }

  return {
    success: true,
    paymentId: json.PaymentId != null ? String(json.PaymentId) : undefined,
    paymentURL: json.PaymentURL,
    raw: json,
  }
}

/** Проверка Token в уведомлении от Tinkoff */
export function tinkoffVerifyNotificationToken(
  body: Record<string, unknown>,
  password: string
): boolean {
  const token = body.Token
  if (typeof token !== 'string') return false
  const params: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(body)) {
    if (k === 'Token') continue
    if (v === undefined || v === null) continue
    if (typeof v === 'object') continue
    params[k] = typeof v === 'number' ? v : String(v)
  }
  const expected = tinkoffGenerateToken(params, password)
  return expected.toLowerCase() === token.toLowerCase()
}
