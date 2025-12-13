'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase, User, Specialization, Service } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { FiSearch, FiUser, FiFilter } from 'react-icons/fi'

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)

  const [masters, setMasters] = useState<User[]>([])
  const [randomProfiles, setRandomProfiles] = useState<User[]>([])
  const [cityFilter, setCityFilter] = useState<string>('')
  const [userCity, setUserCity] = useState<string>('')
  const [specializations, setSpecializations] = useState<Specialization[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedSpec, setSelectedSpec] = useState<string>('')
  const [selectedService, setSelectedService] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchReference = async () => {
      try {
        const [{ data: specData }, { data: svcData }] = await Promise.all([
          supabase.from('specializations').select('*').order('name', { ascending: true }),
          supabase.from('services').select('*').order('name', { ascending: true }),
        ])
        setSpecializations((specData as Specialization[]) || [])
        setServices((svcData as Service[]) || [])
      } catch (error) {
        console.error('Error fetching reference data:', error)
      }
    }
    fetchReference()
  }, [])

  useEffect(() => {
    if (user) {
      performSearch()
    }
  }, [query, cityFilter, selectedSpec, selectedService, user])

  useEffect(() => {
    if (user) {
      fetchUserCity()
      fetchRandomProfiles()
    }
  }, [user])

  const performSearch = async () => {
    const hasFilters =
      query.trim().length > 0 ||
      !!selectedSpec ||
      !!selectedService ||
      !!cityFilter

    // Если нет фильтров — показываем подборку по городу
    if (!hasFilters) {
      await fetchRandomProfiles()
      setMasters([])
      return
    }

    setLoading(true)

    try {
      await searchMasters()
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRandomProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          profile_specializations (
            specialization:specializations (id, name, slug)
          ),
          profile_services (
            service:services (id, name, slug, specialization_id)
          )
        `)
        .eq('role', 'master')
        .ilike('city', userCity || '')
        .limit(20)

      if (error) throw error
      const list = (data as any[]) || []
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[list[i], list[j]] = [list[j], list[i]]
      }
      setRandomProfiles(list)
    } catch (error) {
      console.error('Error fetching random profiles:', error)
      setRandomProfiles([])
    }
  }

  const fetchUserCity = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user!.id)
        .maybeSingle()
      if (error) throw error
      setUserCity((data as any)?.city || '')
    } catch (error) {
      console.error('Error fetching user city:', error)
      setUserCity('')
    }
  }

  const searchMasters = async () => {
    try {
      const filteredIds = await fetchProfileIdsByFilters()
      if (filteredIds && filteredIds.length === 0) {
        setMasters([])
        return
      }

      const cityForQuery = cityFilter || userCity

      let queryBuilder = supabase
        .from('profiles')
        .select(`
          *,
          profile_specializations (
            specialization:specializations (id, name, slug)
          ),
          profile_services (
            service:services (id, name, slug, specialization_id)
          )
        `)
        .or(`full_name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('role', 'master')

      if (cityForQuery) {
        queryBuilder = queryBuilder.ilike('city', `%${cityForQuery}%`)
      }

      if (filteredIds) {
        queryBuilder = queryBuilder.in('id', filteredIds)
      }

      const { data, error } = await queryBuilder.limit(20)

      if (error) throw error
      setMasters((data as any[]) || [])
    } catch (error) {
      console.error('Error searching masters:', error)
      setMasters([])
    }
  }

  const fetchProfileIdsByFilters = async (): Promise<string[] | null> => {
    try {
      if (selectedService) {
        const { data, error } = await supabase
          .from('profile_services')
          .select('profile_id')
          .eq('service_id', selectedService)
        if (error) throw error
        return (data || []).map((row) => row.profile_id as string)
      }
      if (selectedSpec) {
        const { data, error } = await supabase
          .from('profile_specializations')
          .select('profile_id')
          .eq('specialization_id', selectedSpec)
        if (error) throw error
        return (data || []).map((row) => row.profile_id as string)
      }
      return null
    } catch (error) {
      console.error('Error filtering masters by spec/service:', error)
      return null
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch()
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  const roleLabels = {
    master: 'Мастер',
    seller: 'Продавец',
    client: 'Клиент',
  }

  const roleEmoji = {
    master: '🔨',
    seller: '🛒',
    client: '👤',
  }

  const filteredServicesForFilter = selectedSpec
    ? services.filter((svc) => svc.specialization_id === selectedSpec)
    : services
  const hasFilters =
    query.trim().length > 0 ||
    !!selectedSpec ||
    !!selectedService ||
    !!cityFilter

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Мастера</h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="card mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск мастеров..."
                  className="input pl-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                >
                  <FiFilter size={20} />
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-4 flex gap-4 flex-wrap">
                <input
                  type="text"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Город"
                  className="input md:w-48"
                />
                <select
                  value={selectedSpec}
                  onChange={(e) => {
                    setSelectedSpec(e.target.value)
                    setSelectedService('')
                  }}
                  className="input md:w-64"
                >
                  <option value="">Все специализации</option>
                  {specializations.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="input md:w-64"
                  disabled={filteredServicesForFilter.length === 0}
                >
                  <option value="">Все услуги</option>
                  {filteredServicesForFilter.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Поиск...</div>
          ) : !hasFilters ? (
            <>
              {randomProfiles.length > 0 ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">
                    Мастера вашего города
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {randomProfiles.map((master) => (
                      <Link
                        key={master.id}
                        href={`/profile/${master.id}`}
                        className="card hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-black border border-gray-200 flex items-center justify-center text-white text-base font-bold">
                            {master.avatar_url ? (
                              <img
                                src={master.avatar_url}
                                alt={master.full_name}
                                className="w-full h-full object-cover border border-gray-200"
                              />
                            ) : (
                              master.full_name[0]?.toUpperCase() || '?'
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">
                              {master.full_name}{' '}
                              <span className="text-sm">
                                {roleEmoji[master.role as keyof typeof roleEmoji]}
                              </span>
                            </div>
                            {master.city && (
                              <div className="text-xs text-gray-500">{master.city}</div>
                            )}
                          </div>
                        </div>
                        {master.description && (
                          <div className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {master.description}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Введите запрос или выберите фильтры
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FiUser />
                  Мастера ({masters.length})
                </h2>
                {masters.length === 0 ? (
                  <div className="card text-center text-gray-500 py-8">
                    Мастера не найдены
                  </div>
                ) : (
                  <div className="space-y-3">
                    {masters.map((master) => (
                      <Link
                        key={master.id}
                        href={`/profile/${master.id}`}
                        className="card hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-black border border-gray-200 flex items-center justify-center text-white text-lg font-bold">
                            {master.avatar_url ? (
                              <img
                                src={master.avatar_url}
                                alt={master.full_name}
                                className="w-full h-full object-cover border border-gray-200"
                              />
                            ) : (
                              master.full_name[0]?.toUpperCase() || '?'
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-lg">
                              {master.full_name}{' '}
                              <span className="text-lg">
                                {roleEmoji[master.role as keyof typeof roleEmoji]}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {roleLabels[master.role as keyof typeof roleLabels]}
                              {master.city && ` • ${master.city}`}
                            </div>
                            {master.description && (
                              <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {master.description}
                              </div>
                            )}
                            {Array.isArray((master as any).profile_specializations) && (master as any).profile_specializations.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {(master as any).profile_specializations.map((item: any) => (
                                  <span
                                    key={item.specialization?.id || item.specialization_id}
                                    className="px-2 py-1 bg-gray-100 border border-gray-200 text-xs text-gray-700 rounded"
                                  >
                                    {item.specialization?.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  )
}

