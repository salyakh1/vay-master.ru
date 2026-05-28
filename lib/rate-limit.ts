const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  identifier: string,
  limit = 30,
  windowMs = 60_000
): { success: boolean; remaining: number } {
  const now = Date.now()
  const entry = requests.get(identifier)

  if (!entry || now > entry.resetAt) {
    requests.set(identifier, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  )
}

export function rateLimitResponse(): Response {
  return Response.json(
    { error: 'Слишком много запросов. Попробуйте через минуту.' },
    { status: 429, headers: { 'Retry-After': '60' } }
  )
}
