'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../providers'
import { supabase, User, Specialization, Service } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import AdBannerSlider from '@/components/AdBannerSlider'
import Link from 'next/link'
import { FiSearch, FiUser, FiFilter, FiMapPin, FiBriefcase, FiStar, FiCheckCircle } from 'react-icons/fi'
import AuthRequiredModal from '@/components/AuthRequiredModal'
import AdSlot from '@/components/AdSlot'
import StoriesCircle from '@/components/StoriesCircle'
import { Story } from '@/lib/supabase'

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
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)

  // Убираем редирект для неавторизованных - они могут видеть карточки мастеров

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
    performSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, cityFilter, selectedSpec, selectedService])

  useEffect(() => {
    // Загружаем всех мастеров при загрузке страницы (для всех пользователей)
    // Рандомность применяется только к порядку отображения
    fetchRandomProfiles()
    // Загружаем истории для всех пользователей (включая неавторизованных)
    fetchStories()
  }, [])

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
      // Показываем всех мастеров без фильтрации по городу
      // Фильтрация по городу применяется только при явном выборе фильтра
      let query = supabase
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

      // Не применяем фильтр по городу пользователя - показываем всех мастеров
      // Фильтр по городу будет применяться только если пользователь явно выберет его в фильтрах

      const { data, error } = await query

      if (error) throw error
      const list = (data as any[]) || []
      // Перемешиваем список для случайного порядка
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

  const fetchStories = async () => {
    try {
      console.log('fetchStories called')
      setStoriesLoading(true)
      const params = new URLSearchParams({
        page: 'search',
        ...(user?.id && { currentUserId: user.id }),
      })
      console.log('Fetching stories with params:', params.toString())
      const response = await fetch(`/api/stories?${params.toString()}`)
      console.log('Response status:', response.status)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch stories')
      }
      const data = await response.json()
      console.log('Stories fetched:', data.stories?.length || 0, 'stories', data.stories)
      setStories(data.stories || [])
    } catch (error) {
      console.error('Error fetching stories:', error)
      setStories([])
    } finally {
      setStoriesLoading(false)
    }
  }

  const searchMasters = async () => {
    try {
      let profileIds: string[] | null = null

      // Если есть текст запроса, ищем по специализациям и услугам
      if (query.trim()) {
        const searchQuery = query.trim()
        
        // Ищем специализации по частичному совпадению
        const { data: specData } = await supabase
          .from('specializations')
          .select('id')
          .ilike('name', `%${searchQuery}%`)
        
        // Ищем услуги по частичному совпадению
        const { data: serviceData } = await supabase
          .from('services')
          .select('id')
          .ilike('name', `%${searchQuery}%`)

        const specIds = (specData || []).map(s => s.id)
        const serviceIds = (serviceData || []).map(s => s.id)

        // Получаем profile_id из найденных специализаций
        let profileIdsFromSpecs: string[] = []
        if (specIds.length > 0) {
          const { data: profileSpecsData } = await supabase
            .from('profile_specializations')
            .select('profile_id')
            .in('specialization_id', specIds)
          profileIdsFromSpecs = (profileSpecsData || []).map(p => p.profile_id as string)
        }

        // Получаем profile_id из найденных услуг
        let profileIdsFromServices: string[] = []
        if (serviceIds.length > 0) {
          const { data: profileServicesData } = await supabase
            .from('profile_services')
            .select('profile_id')
            .in('service_id', serviceIds)
          profileIdsFromServices = (profileServicesData || []).map(p => p.profile_id as string)
        }

        // Объединяем все найденные profile_id
        const allProfileIds = Array.from(new Set([...profileIdsFromSpecs, ...profileIdsFromServices]))
        
        if (allProfileIds.length > 0) {
          profileIds = allProfileIds
        } else {
          // Если не нашли по специализациям/услугам, ищем по имени и описанию
          profileIds = null // Будем искать по имени и описанию ниже
        }
      }

      // Если выбрана специализация или услуга, получаем profile_id
      const filteredIds = await fetchProfileIdsByFilters()
      
      // Объединяем результаты поиска и фильтров
      let finalProfileIds: string[] | null = null
      if (profileIds && filteredIds) {
        // Пересечение: мастера должны соответствовать и поиску, и фильтрам
        finalProfileIds = profileIds.filter(id => filteredIds.includes(id))
      } else if (profileIds) {
        finalProfileIds = profileIds
      } else if (filteredIds) {
        finalProfileIds = filteredIds
      }

      if (finalProfileIds && finalProfileIds.length === 0) {
        setMasters([])
        return
      }

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
        .eq('role', 'master')

      // Если есть текст запроса и не нашли по специализациям/услугам, ищем по имени и описанию
      if (query.trim() && !profileIds) {
        queryBuilder = queryBuilder.or(`full_name.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%`)
      }

      // Фильтр по городу: применяется только если пользователь явно выбрал его в фильтрах
      if (cityFilter && cityFilter.trim()) {
        queryBuilder = queryBuilder.ilike('city', `%${cityFilter.trim()}%`)
      }

      // Применяем фильтр по profile_id (из поиска или фильтров)
      if (finalProfileIds) {
        queryBuilder = queryBuilder.in('id', finalProfileIds)
      }

      const { data, error } = await queryBuilder.limit(50)

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

  // Убираем проверку авторизации - неавторизованные могут видеть карточки мастеров

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
    <div className="min-h-screen bg-bg-primary pb-20">
      {user && <Navbar />}
      {/* Баннеры без отступов по бокам */}
      <div className="w-full mb-6">
        <AdBannerSlider page="search" />
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6 text-text-primary">Мастера</h1>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={16} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск мастеров..."
                  className="input pl-10 pr-10 h-10 text-sm w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <FiFilter size={16} />
                </button>
              </div>

              {/* Filters */}
              {showFilters && (
                <>
                  <input
                    type="text"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    placeholder="Город"
                    className="input w-full h-10 text-sm"
                  />
                  <div className={`relative select-wrapper w-full ${selectedSpec ? 'has-value' : ''}`} data-placeholder="Специализация">
                    <select
                      value={selectedSpec || ''}
                      onChange={(e) => {
                        setSelectedSpec(e.target.value)
                        setSelectedService('')
                      }}
                      className="input w-full h-10 text-sm appearance-none cursor-pointer"
                      style={{
                        color: !selectedSpec ? 'transparent' : 'var(--text-primary)',
                      }}
                    >
                      <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                        Специализация
                      </option>
                      {specializations.map((spec) => (
                        <option key={spec.id} value={spec.id} style={{ color: 'var(--text-primary)' }}>
                          {spec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`relative select-wrapper w-full ${selectedService ? 'has-value' : ''}`} data-placeholder="Услуга">
                    <select
                      value={selectedService || ''}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="input w-full h-10 text-sm appearance-none cursor-pointer"
                      style={{
                        color: !selectedService ? 'transparent' : 'var(--text-primary)',
                      }}
                      disabled={filteredServicesForFilter.length === 0}
                    >
                      <option value="" disabled style={{ color: 'var(--text-muted)', display: 'none' }}>
                        Услуга
                      </option>
                      {filteredServicesForFilter.map((svc) => (
                        <option key={svc.id} value={svc.id} style={{ color: 'var(--text-primary)' }}>
                          {svc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary h-10 w-full text-sm">
                Найти
              </button>
            </div>
          </form>

          {/* Истории мастеров - под фильтром (видны всем) */}
          {storiesLoading ? (
            <div className="mb-6 text-center text-text-secondary text-sm">Загрузка историй...</div>
          ) : stories.length > 0 ? (
            <div className="mb-6">
              <StoriesCircle
                stories={stories}
                currentUser={user || null}
                isOwnProfile={false}
                onStoryCreated={fetchStories}
              />
            </div>
          ) : null}

          {/* Results */}
          {loading ? (
            <div className="text-center py-12 text-text-secondary">Поиск...</div>
          ) : !hasFilters ? (
            <>
              {randomProfiles.length > 0 ? (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary mb-2">
                    Мастера вашего города
                  </h2>
                  <div className="grid grid-cols-2 gap-5">
                    {randomProfiles.map((master, index) => {
                      const MasterCard = (
                        <div className="card-glossy group h-[400px] flex flex-col !p-0 overflow-hidden relative">
                          {/* Глянцевый эффект */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 rounded-[12px]"></div>
                          
                          {/* Квадратный аватар на всю ширину */}
                          <div className="w-full h-[200px] bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white text-2xl font-semibold rounded-t-[12px] flex-shrink-0 overflow-hidden relative group/image">
                            {master.avatar_url ? (
                              <>
                                <img
                                  src={master.avatar_url}
                                  alt={master.full_name}
                                  className="w-full h-[200px] object-cover transition-all duration-500 group-hover/image:scale-110 group-hover/image:brightness-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                              </>
                            ) : (
                              master.full_name[0]?.toUpperCase() || '?'
                            )}
                          </div>

                          {/* Основная информация */}
                          <div className="flex flex-col items-center text-center p-5 relative z-20">
                            <h3 className="font-semibold text-base bg-gradient-to-r from-graphite-secondary to-graphite-primary bg-clip-text text-transparent mb-1.5 line-clamp-2 leading-tight group-hover:from-brand-accent group-hover:to-brand-accent-hover transition-all">
                              {master.full_name}
                            </h3>
                            {master.city && (
                              <div className="flex items-center gap-1 text-xs text-text-secondary mb-2.5">
                                <FiMapPin size={12} strokeWidth={2} className="text-brand-accent/60" />
                                <span>{master.city}</span>
                              </div>
                            )}
                            {/* Рейтинг мастера */}
                            {master.master_reviews_count && master.master_reviews_count > 0 ? (
                              <div className="flex items-center gap-1 text-xs text-text-secondary mb-2.5">
                                {master.master_rating && master.master_rating > 0 ? (
                                  <>
                                    <span>⭐</span>
                                    <span className="font-medium">
                                      {master.master_rating.toFixed(1)} ({master.master_reviews_count})
                                    </span>
                                  </>
                                ) : (
                                  <span className="font-medium">
                                    ({master.master_reviews_count} {master.master_reviews_count === 1 ? 'отзыв' : master.master_reviews_count < 5 ? 'отзыва' : 'отзывов'})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-text-secondary mb-2.5">
                                Без отзывов
                              </div>
                            )}
                          </div>

                          {/* Описание */}
                          {master.description && (
                            <p className="text-xs text-text-secondary mb-3.5 line-clamp-2 leading-relaxed flex-1 px-5">
                              {master.description}
                            </p>
                          )}

                          {/* Специализации */}
                          {Array.isArray((master as any).profile_specializations) && (master as any).profile_specializations.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-border-light/40 px-5 pb-6 relative z-20">
                              {(master as any).profile_specializations.slice(0, 2).map((item: any) => (
                                <span
                                  key={item.specialization?.id || item.specialization_id}
                                  className="px-2 py-0.5 bg-gradient-to-br from-brand-accent/15 to-brand-accent/10 text-brand-accent text-[10px] font-medium rounded-lg border border-brand-accent/30 backdrop-blur-sm shadow-sm transition-all group-hover:border-brand-accent/50 group-hover:shadow-md"
                                >
                                  {item.specialization?.name}
                                </span>
                              ))}
                              {(master as any).profile_specializations.length > 2 && (
                                <span className="px-2 py-0.5 text-text-muted text-[10px] font-medium">
                                  +{(master as any).profile_specializations.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )

                      const cardElement = user ? (
                        <Link key={master.id} href={`/profile/${master.id}`}>
                          {MasterCard}
                        </Link>
                      ) : (
                        <div key={master.id} onClick={() => setShowAuthModal(true)} className="cursor-pointer">
                          {MasterCard}
                        </div>
                      )

                      // Показываем INLINE_CONTEXT рекламу каждые 6 карточек (после 5, 11, 17 и т.д.)
                      const shouldShowAd = index > 0 && (index + 1) % 6 === 0

                      if (shouldShowAd) {
                        return (
                          <>
                            {cardElement}
                            <div key={`ad-inline-${master.id}-${index}`} className="col-span-2">
                              <AdSlot 
                                type="INLINE_CONTEXT" 
                                context={{ 
                                  page: 'search',
                                  category: selectedSpec ? [selectedSpec] : undefined,
                                  city: cityFilter || userCity || undefined
                                }}
                                index={index}
                                className="my-4"
                              />
                            </div>
                          </>
                        )
                      }

                      return cardElement
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-text-secondary">
                  Введите запрос или выберите фильтры
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2 mb-2">
                <FiUser />
                Мастера ({masters.length})
              </h2>
              {masters.length === 0 ? (
                <div className="card text-center text-text-secondary py-12">
                  Мастера не найдены
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-5">
                  {masters.map((master, index) => {
                    const MasterCard = (
                      <div className="card-glossy group h-[400px] flex flex-col !p-0 overflow-hidden relative">
                        {/* Глянцевый эффект */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 rounded-[12px]"></div>
                        
                        {/* Квадратный аватар на всю ширину */}
                        <div className="w-full h-[200px] bg-gradient-to-br from-graphite-primary to-graphite-tertiary flex items-center justify-center text-white text-2xl font-semibold rounded-t-[12px] flex-shrink-0 overflow-hidden relative group/image">
                          {master.avatar_url ? (
                            <>
                              <img
                                src={master.avatar_url}
                                alt={master.full_name}
                                className="w-full h-[200px] object-cover transition-all duration-500 group-hover/image:scale-110 group-hover/image:brightness-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            </>
                          ) : (
                            master.full_name[0]?.toUpperCase() || '?'
                          )}
                        </div>

                        {/* Основная информация */}
                        <div className="flex flex-col items-center text-center p-5 relative z-20">
                          <h3 className="font-semibold text-base bg-gradient-to-r from-graphite-secondary to-graphite-primary bg-clip-text text-transparent mb-1.5 line-clamp-2 leading-tight group-hover:from-brand-accent group-hover:to-brand-accent-hover transition-all">
                            {master.full_name}
                          </h3>
                          {master.city && (
                            <div className="flex items-center gap-1 text-xs text-text-secondary mb-2.5">
                              <FiMapPin size={12} strokeWidth={2} className="text-brand-accent/60" />
                              <span>{master.city}</span>
                            </div>
                          )}
                          {/* Рейтинг мастера */}
                          {master.master_reviews_count && master.master_reviews_count > 0 ? (
                            <div className="flex items-center gap-1 text-xs text-text-secondary mb-2.5">
                              {master.master_rating && master.master_rating > 0 ? (
                                <>
                                  <span>⭐</span>
                                  <span className="font-medium">
                                    {master.master_rating.toFixed(1)} ({master.master_reviews_count})
                                  </span>
                                </>
                              ) : (
                                <span className="font-medium">
                                  ({master.master_reviews_count} {master.master_reviews_count === 1 ? 'отзыв' : master.master_reviews_count < 5 ? 'отзыва' : 'отзывов'})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-text-secondary mb-2.5">
                              Без отзывов
                            </div>
                          )}
                        </div>

                        {/* Описание */}
                        {master.description && (
                          <p className="text-xs text-text-secondary mb-3.5 line-clamp-2 leading-relaxed flex-1 px-5">
                            {master.description}
                          </p>
                        )}

                        {/* Специализации */}
                        {Array.isArray((master as any).profile_specializations) && (master as any).profile_specializations.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-border-light/40 px-5 pb-6 relative z-20">
                            {(master as any).profile_specializations.slice(0, 2).map((item: any) => (
                              <span
                                key={item.specialization?.id || item.specialization_id}
                                className="px-2 py-0.5 bg-gradient-to-br from-brand-accent/15 to-brand-accent/10 text-brand-accent text-[10px] font-medium rounded-lg border border-brand-accent/30 backdrop-blur-sm shadow-sm transition-all group-hover:border-brand-accent/50 group-hover:shadow-md"
                              >
                                {item.specialization?.name}
                              </span>
                            ))}
                            {(master as any).profile_specializations.length > 2 && (
                              <span className="px-2 py-0.5 text-text-muted text-[10px] font-medium">
                                +{(master as any).profile_specializations.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )

                    const cardElement = user ? (
                      <Link key={master.id} href={`/profile/${master.id}`}>
                        {MasterCard}
                      </Link>
                    ) : (
                      <div key={master.id} onClick={() => setShowAuthModal(true)} className="cursor-pointer">
                        {MasterCard}
                      </div>
                    )

                    // Показываем INLINE_CONTEXT рекламу каждые 6 карточек (после 5, 11, 17 и т.д.)
                    const shouldShowAd = index > 0 && (index + 1) % 6 === 0

                    if (shouldShowAd) {
                      return (
                        <>
                          {cardElement}
                          <div key={`ad-inline-filtered-${master.id}-${index}`} className="col-span-2">
                            <AdSlot 
                              type="INLINE_CONTEXT" 
                              context={{ 
                                page: 'search',
                                category: selectedSpec ? [selectedSpec] : undefined,
                                keywords: query ? [query] : undefined,
                                city: cityFilter || userCity || undefined
                              }}
                              index={index}
                              className="my-4"
                            />
                          </div>
                        </>
                      )
                    }

                    return cardElement
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auth Required Modal */}
      <AuthRequiredModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        type="master"
      />
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

