import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      return { title: 'Профиль мастера' }
    }
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { data } = await supabase
      .from('profiles')
      .select('full_name, city, role, specialization')
      .eq('id', params.id)
      .maybeSingle()
    if (!data) return { title: 'Профиль' }
    const name = data.full_name || 'Профиль'
    const city = data.city ? ` — ${data.city}` : ''
    const services = data.specialization ? ` — ${data.specialization}` : ''
    return {
      title: `${name}${services}${city}`,
      description: `${name}${city}. Профиль на VayMaster — мастера и материалы рядом.`,
    }
  } catch {
    return { title: 'Профиль' }
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
