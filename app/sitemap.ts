import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://vay-master.ru'
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/search`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/products`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/rules`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/auth/register`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key || url.includes('placeholder')) return staticRoutes

    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { data } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .eq('role', 'master')
      .order('updated_at', { ascending: false })
      .limit(500)

    const masters: MetadataRoute.Sitemap = (data || []).map((p) => ({
      url: `${base}/profile/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
    return [...staticRoutes, ...masters]
  } catch {
    return staticRoutes
  }
}
