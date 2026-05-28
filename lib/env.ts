// Важно: NEXT_PUBLIC_* читаем только через process.env.NEXT_PUBLIC_...
// (не process.env[key]) — иначе Next.js не подставит значения в клиентский бандл.

function requirePublic(
  value: string | undefined,
  key: string
): string {
  if (!value) {
    const msg = `❌ Отсутствует обязательная переменная окружения: ${key}`
    if (process.env.NODE_ENV === 'production') throw new Error(msg)
    console.error(msg)
    return ''
  }
  return value
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: requirePublic(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL'
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requirePublic(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ADMIN_SYSTEM_USER_ID: process.env.ADMIN_SYSTEM_USER_ID ?? '',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const
