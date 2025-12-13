'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { supabase, User, PortfolioItem, Specialization, Service, Product } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import PortfolioGrid from '@/components/PortfolioGrid'
import PortfolioGallery from '@/components/PortfolioGallery'
import { FiMapPin, FiPhone, FiMail, FiPlus, FiBriefcase, FiClock, FiHome } from 'react-icons/fi'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState<number | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile')
  const [specializations, setSpecializations] = useState<Specialization[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedSpecializationIds, setSelectedSpecializationIds] = useState<string[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [profileSpecializations, setProfileSpecializations] = useState<Specialization[]>([])
  const [profileServices, setProfileServices] = useState<Service[]>([])
  const [isFollowing, setIsFollowing] = useState<boolean>(false)
  const [followLoading, setFollowLoading] = useState(false)
  
  // Settings form state - common
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Master fields
  const [servicesText, setServicesText] = useState('')
  const [serviceLocation, setServiceLocation] = useState<'home' | 'workshop' | 'both'>('both')
  const [experienceYears, setExperienceYears] = useState<number | ''>('')
  const [specialization, setSpecialization] = useState('')
  const [workSchedule, setWorkSchedule] = useState('')
  
  // Seller fields
  const [storeAddress, setStoreAddress] = useState('')
  const [workHours, setWorkHours] = useState('')
  const [deliveryAvailable, setDeliveryAvailable] = useState(false)
  const [deliveryZones, setDeliveryZones] = useState('')
  const [productCategories, setProductCategories] = useState('')

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/')
    }
  }, [currentUser, authLoading, router])

  useEffect(() => {
    if (params.id) {
      fetchProfile()
    checkFollowing()
      fetchPortfolio()
      fetchSellerProducts()
    }
  }, [params.id])

  useEffect(() => {
    fetchReferenceData()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      const userData = data as User
      setProfile(userData)
      // Initialize form with profile data - common
      setFullName(userData.full_name || '')
      setPhone(userData.phone || '')
      setCity(userData.city || '')
      setDescription(userData.description || '')
      // Master fields
      setServicesText(userData.services || '')
      setServiceLocation(userData.service_location || 'both')
      setExperienceYears(userData.experience_years || '')
      setSpecialization(userData.specialization || '')
      setWorkSchedule(userData.work_schedule || '')
      // Seller fields
      setStoreAddress(userData.store_address || '')
      setWorkHours(userData.work_hours || '')
      setDeliveryAvailable(userData.delivery_available || false)
      setDeliveryZones(userData.delivery_zones || '')
      setProductCategories(userData.product_categories || '')

      await fetchSelections()
      if (userData.role === 'master') {
        fetchPortfolio()
      }
      if (userData.role === 'seller') {
        fetchSellerProducts()
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkFollowing = async () => {
    if (!currentUser || !params.id) return
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', params.id)
        .maybeSingle()
      if (error) throw error
      setIsFollowing(!!data)
    } catch (error) {
      setIsFollowing(false)
    }
  }

  const fetchReferenceData = async () => {
    try {
      const [{ data: specData, error: specError }, { data: svcData, error: svcError }] = await Promise.all([
        supabase.from('specializations').select('*').order('name', { ascending: true }),
        supabase.from('services').select('*').order('name', { ascending: true })
      ])

      if (specError) throw specError
      if (svcError) throw svcError

      setSpecializations((specData as Specialization[]) || [])
      setServices((svcData as Service[]) || [])
    } catch (error) {
      console.error('Error fetching reference data:', error)
    }
  }

  const fetchSelections = async () => {
    if (!params.id) return
    try {
      const [{ data: specSel, error: specSelError }, { data: svcSel, error: svcSelError }] = await Promise.all([
        supabase
          .from('profile_specializations')
          .select('specialization:specializations(id, name, slug)')
          .eq('profile_id', params.id),
        supabase
          .from('profile_services')
          .select('service:services(id, name, slug, specialization_id)')
          .eq('profile_id', params.id),
      ])

      if (specSelError) throw specSelError
      if (svcSelError) throw svcSelError

      const specs = ((specSel as any[]) || [])
        .map((item) => item.specialization as Specialization)
        .filter(Boolean)
      const svcs = ((svcSel as any[]) || [])
        .map((item) => item.service as Service)
        .filter(Boolean)

      setProfileSpecializations(specs)
      setProfileServices(svcs)
      setSelectedSpecializationIds(specs.map((s) => s.id))
      setSelectedServiceIds(svcs.map((s) => s.id))
    } catch (error) {
      console.error('Error fetching selections:', error)
    }
  }

  const toggleSpecialization = (id: string) => {
    setSelectedSpecializationIds((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id]
      // drop services that no longer belong to selected specializations
      setSelectedServiceIds((prevServices) =>
        prevServices.filter((svcId) => {
          const svc = services.find((s) => s.id === svcId)
          return svc ? next.includes(svc.specialization_id) : false
        })
      )
      return next
    })
  }

  const toggleService = (id: string) => {
    const svc = services.find((s) => s.id === id)
    if (svc && !selectedSpecializationIds.includes(svc.specialization_id)) {
      // auto-select specialization if not selected
      setSelectedSpecializationIds((prev) => [...prev, svc.specialization_id])
    }
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const syncSelections = async (profileId: string) => {
    try {
      // specializations
      await supabase.from('profile_specializations').delete().eq('profile_id', profileId)
      if (selectedSpecializationIds.length > 0) {
        const specPayload = selectedSpecializationIds.map((specId) => ({
          profile_id: profileId,
          specialization_id: specId,
        }))
        await supabase.from('profile_specializations').insert(specPayload)
      }

      // services
      await supabase.from('profile_services').delete().eq('profile_id', profileId)
      if (selectedServiceIds.length > 0) {
        const svcPayload = selectedServiceIds.map((svcId) => ({
          profile_id: profileId,
          service_id: svcId,
        }))
        await supabase.from('profile_services').insert(svcPayload)
      }
    } catch (error) {
      console.error('Error syncing selections:', error)
    }
  }

  const toggleFollow = async () => {
    if (!currentUser || !profile) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)
        setIsFollowing(false)
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUser.id, following_id: profile.id })
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Follow error:', error)
    } finally {
      setFollowLoading(false)
    }
  }


  const fetchPortfolio = async () => {
    if (!params.id) return
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*, master:profiles(id, full_name, avatar_url, role)')
        .eq('master_id', params.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPortfolioItems(data as PortfolioItem[] || [])
    } catch (error) {
      console.error('Error fetching portfolio:', error)
    }
  }

  const fetchSellerProducts = async () => {
    if (!params.id) return
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles(id, full_name, avatar_url, city)
        `)
        .eq('seller_id', params.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setProducts((data as Product[]) || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    }
  }

  useEffect(() => {
    if (profile?.role === 'master' && params.id) {
      fetchPortfolio()
    }
    if (profile?.role === 'seller' && params.id) {
      fetchSellerProducts()
    }
  }, [profile?.role, params.id])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !profile) return

    setSaving(true)
    try {
      const updateData: any = {
        full_name: fullName,
        phone: phone || null,
        city: city || null,
        description: description || null,
      }

      // Add master-specific fields
      if (profile.role === 'master') {
        updateData.services = servicesText || null
        updateData.service_location = serviceLocation || null
        updateData.experience_years = experienceYears ? Number(experienceYears) : null
        updateData.specialization = specialization || null
        updateData.work_schedule = workSchedule || null
      }

      // Add seller-specific fields
      if (profile.role === 'seller') {
        updateData.store_address = storeAddress || null
        updateData.work_hours = workHours || null
        updateData.delivery_available = deliveryAvailable
        updateData.delivery_zones = deliveryZones || null
        updateData.product_categories = productCategories || null
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id)

      if (error) throw error

      await syncSelections(currentUser.id)
      await fetchSelections()
      // Refresh profile data
      await fetchProfile()
      setActiveTab('profile')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Ошибка при сохранении профиля')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!profile || !currentUser) return null

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

  const isOwnProfile = currentUser.id === profile.id
  const filteredServices = services.filter((svc) =>
    selectedSpecializationIds.includes(svc.specialization_id)
  )

  return (
    <div className="min-h-screen bg-white pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'profile'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              Профиль
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                  activeTab === 'settings'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                Настройки
              </button>
            )}
          </div>

          {/* Profile Tab Content */}
          {activeTab === 'profile' && (
            <>
              {/* Profile Header */}
              <div className="card mb-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-24 h-24 bg-black border-2 border-gray-200 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-full h-full object-cover border border-gray-200"
                      />
                    ) : (
                      profile.full_name[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                      <span className="text-xl">
                        {roleEmoji[profile.role as keyof typeof roleEmoji]}
                      </span>
                      <span className="px-2 py-0.5 border border-gray-200 text-black text-xs font-medium uppercase tracking-wide">
                        {roleLabels[profile.role as keyof typeof roleLabels]}
                      </span>
                      {!isOwnProfile && profile.role !== 'client' && (
                        <button
                          onClick={toggleFollow}
                          disabled={followLoading}
                          className={`ml-2 px-3 py-1 text-xs border ${
                            isFollowing ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'
                          }`}
                        >
                          {followLoading ? '...' : isFollowing ? 'Отписаться' : 'Подписаться'}
                        </button>
                      )}
                    </div>
                    {profile.description && (
                      <p className="text-gray-600 mb-4 text-sm">{profile.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                      {profile.city && (
                        <div className="flex items-center gap-1">
                          <FiMapPin size={14} />
                          <span>{profile.city}</span>
                        </div>
                      )}
                      {profile.phone && (
                        <div className="flex items-center gap-1">
                          <FiPhone size={14} />
                          <span>{profile.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <FiMail size={14} />
                        <span>{profile.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Master-specific information */}
                {profile.role === 'master' && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    {profileSpecializations.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                          <FiBriefcase size={14} />
                          <span>Специализации</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profileSpecializations.map((spec) => (
                            <span
                              key={spec.id}
                              className="px-2.5 py-1 bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700 rounded"
                            >
                              {spec.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.services && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                            <FiBriefcase size={14} />
                            <span>Описание услуг</span>
                          </div>
                          <p className="text-sm text-gray-600">{profile.services}</p>
                        </div>
                      )}
                      {profile.service_location && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                            <FiHome size={14} />
                            <span>Место обслуживания</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {profile.service_location === 'home' && 'Выезд на дом'}
                            {profile.service_location === 'workshop' && 'В мастерской'}
                            {profile.service_location === 'both' && 'Выезд и в мастерской'}
                          </p>
                        </div>
                      )}
                      {profile.experience_years && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                            <FiBriefcase size={14} />
                            <span>Опыт работы</span>
                          </div>
                          <p className="text-sm text-gray-600">{profile.experience_years} {profile.experience_years === 1 ? 'год' : profile.experience_years < 5 ? 'года' : 'лет'}</p>
                        </div>
                      )}
                      {profile.work_schedule && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                            <FiClock size={14} />
                            <span>График работы</span>
                          </div>
                          <p className="text-sm text-gray-600">{profile.work_schedule}</p>
                        </div>
                      )}
                    </div>

                    {profileServices.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                          <FiBriefcase size={14} />
                          <span>Выбранные услуги</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profileServices.map((svc) => (
                            <span
                              key={svc.id}
                              className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-xs text-gray-700 rounded"
                            >
                              {svc.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profileSpecializations.length === 0 && profile.specialization && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                          <FiBriefcase size={14} />
                          <span>Специализация</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profile.specialization.split(',').map((spec, index) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700 rounded"
                            >
                              {spec.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Products for Sellers */}
              {profile.role === 'seller' && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Товары продавца</h2>
                    {isOwnProfile && (
                      <Link
                        href="/products/new"
                        className="px-3 py-1.5 text-xs font-medium bg-black text-white border border-black hover:bg-gray-800 transition-colors"
                      >
                        Добавить товар
                      </Link>
                    )}
                  </div>
                  {products.length === 0 ? (
                    <div className="card text-center text-gray-500 py-10">
                      Пока нет товаров
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {products.map((product) => {
                        const thumb = product.images && product.images.length > 0 ? product.images[0] : ''
                        return (
                          <Link
                            key={product.id}
                            href={`/products/${product.id}`}
                            className="card hover:bg-gray-50 transition flex gap-4 items-center"
                          >
                            <div className="w-20 h-20 bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                              {thumb ? (
                                <img src={thumb} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-3xl">🛒</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-base font-semibold text-black line-clamp-1">
                                {product.name}
                              </div>
                              <div className="text-xl font-bold text-blue-600 mt-1">
                                {product.price.toLocaleString('ru-RU')} ₽
                              </div>
                              <div className="text-sm text-gray-600 line-clamp-2 mt-1">
                                {product.category || 'Категория не указана'}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Portfolio for Masters */}
              {profile.role === 'master' && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Портфолио</h2>
                    <div className="flex items-center gap-2">
                      {isOwnProfile && (
                        <Link
                          href="/portfolio/new"
                          className="px-3 py-1.5 text-xs font-medium bg-black text-white border border-black hover:bg-gray-800 transition-colors flex items-center gap-1.5"
                        >
                          <FiPlus size={12} />
                          Добавить работу
                        </Link>
                      )}
                    </div>
                  </div>
                  <PortfolioGrid
                    items={portfolioItems}
                    onItemClick={(item, index) => setSelectedPortfolioIndex(index)}
                  />
                </div>
              )}
            </>
          )}

          {/* Portfolio Gallery Modal */}
          {selectedPortfolioIndex !== null && portfolioItems.length > 0 && (
            <PortfolioGallery
              items={portfolioItems}
              initialIndex={selectedPortfolioIndex}
              onClose={() => setSelectedPortfolioIndex(null)}
            />
          )}

          {/* Settings Tab Content */}
          {activeTab === 'settings' && isOwnProfile && (
            <div className="card">
              <h1 className="text-xl font-bold mb-6">Настройки</h1>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ФИО *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Город
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    О себе
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea"
                    rows={5}
                  />
                </div>

                {/* Master-specific fields */}
                {profile.role === 'master' && (
                  <>
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <h3 className="text-base font-bold mb-4">Информация для мастера</h3>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Описание услуг (необязательно)
                        </label>
                        <textarea
                          value={servicesText}
                          onChange={(e) => setServicesText(e.target.value)}
                          placeholder="Кратко опишите ваши услуги или особенности работы"
                          className="textarea"
                          rows={4}
                        />
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          Место обслуживания *
                        </label>
                        <select
                          value={serviceLocation}
                          onChange={(e) => setServiceLocation(e.target.value as 'home' | 'workshop' | 'both')}
                          className="input"
                          required
                        >
                          <option value="home">Выезд на дом</option>
                          <option value="workshop">В мастерской</option>
                          <option value="both">Выезд и в мастерской</option>
                        </select>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          Специализации (выберите подходящее)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-gray-200 p-3 rounded">
                          {specializations.map((spec) => (
                            <label key={spec.id} className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={selectedSpecializationIds.includes(spec.id)}
                                onChange={() => toggleSpecialization(spec.id)}
                                className="w-4 h-4"
                              />
                              <span>{spec.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          Услуги (отфильтрованы по выбранным специализациям)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-gray-200 p-3 rounded">
                          {filteredServices.length === 0 ? (
                            <p className="text-sm text-gray-500">Сначала выберите специализации</p>
                          ) : (
                            filteredServices.map((svc) => (
                              <label key={svc.id} className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={selectedServiceIds.includes(svc.id)}
                                  onChange={() => toggleService(svc.id)}
                                  className="w-4 h-4"
                                />
                                <span>{svc.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          Опыт работы (лет)
                        </label>
                        <input
                          type="number"
                          value={experienceYears}
                          onChange={(e) => setExperienceYears(e.target.value ? Number(e.target.value) : '')}
                          min="0"
                          max="100"
                          className="input"
                          placeholder="Например: 5"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          График работы
                        </label>
                        <input
                          type="text"
                          value={workSchedule}
                          onChange={(e) => setWorkSchedule(e.target.value)}
                          placeholder="Например: Пн-Пт 9:00-18:00, Сб 10:00-16:00"
                          className="input"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Seller-specific fields */}
                {profile.role === 'seller' && (
                  <>
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <h3 className="text-base font-bold mb-4">Информация для продавца</h3>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Адрес магазина/склада
                        </label>
                        <input
                          type="text"
                          value={storeAddress}
                          onChange={(e) => setStoreAddress(e.target.value)}
                          placeholder="Полный адрес вашего магазина или склада"
                          className="input"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          Режим работы
                        </label>
                        <input
                          type="text"
                          value={workHours}
                          onChange={(e) => setWorkHours(e.target.value)}
                          placeholder="Например: Пн-Сб 10:00-20:00, Вс 11:00-18:00"
                          className="input"
                        />
                      </div>

                      <div className="mt-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={deliveryAvailable}
                            onChange={(e) => setDeliveryAvailable(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium">Предоставляю доставку</span>
                        </label>
                      </div>

                      {deliveryAvailable && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium mb-2">
                            Зоны доставки
                          </label>
                          <input
                            type="text"
                            value={deliveryZones}
                            onChange={(e) => setDeliveryZones(e.target.value)}
                            placeholder="Например: Вся Москва, МО до 50 км"
                            className="input"
                          />
                        </div>
                      )}

                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          Категории товаров
                        </label>
                        <input
                          type="text"
                          value={productCategories}
                          onChange={(e) => setProductCategories(e.target.value)}
                          placeholder="Например: Инструменты, Стройматериалы, Электроинструмент"
                          className="input"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium bg-black text-white border border-black hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFullName(profile.full_name || '')
                      setPhone(profile.phone || '')
                      setCity(profile.city || '')
                      setDescription(profile.description || '')
                      setSelectedSpecializationIds(profileSpecializations.map((s) => s.id))
                      setSelectedServiceIds(profileServices.map((s) => s.id))
                      // Reset master fields
                      if (profile.role === 'master') {
                        setServicesText(profile.services || '')
                        setServiceLocation(profile.service_location || 'both')
                        setExperienceYears(profile.experience_years || '')
                        setWorkSchedule(profile.work_schedule || '')
                      }
                      // Reset seller fields
                      if (profile.role === 'seller') {
                        setStoreAddress(profile.store_address || '')
                        setWorkHours(profile.work_hours || '')
                        setDeliveryAvailable(profile.delivery_available || false)
                        setDeliveryZones(profile.delivery_zones || '')
                        setProductCategories(profile.product_categories || '')
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium bg-white text-black border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


