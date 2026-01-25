import { supabase } from '@/lib/supabase'

export type Master = {
  id: string
  name: string
  services: string[]
  rating: number | null
  city: string | null
}

type FetchMastersParams = {
  serviceName: string
  city: string
}

export const fetchMastersByServiceAndCity = async ({
  serviceName,
  city,
}: FetchMastersParams): Promise<Master[]> => {
  const { data, error } = await supabase
    .from('masters')
    .select('id, name, services, rating, city')
    .eq('city', city)

  if (error || !data) {
    return []
  }

  return (data as Master[])
    .filter((master) => Array.isArray(master.services) && master.services.includes(serviceName))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
}
