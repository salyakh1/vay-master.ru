import { createClient } from '@supabase/supabase-js'

// Прямой доступ — Next.js инлайнит NEXT_PUBLIC_* в клиентский код
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file:\n' +
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export * from '@/types/db'
