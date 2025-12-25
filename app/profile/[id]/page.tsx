'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/providers'
import { supabase, User, PortfolioItem, Specialization, Service, Product } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import PortfolioGrid from '@/components/PortfolioGrid'
import PortfolioGallery from '@/components/PortfolioGallery'
import { FiMapPin, FiPhone, FiMail, FiPlus, FiBriefcase, FiClock, FiHome, FiMessageCircle, FiCamera, FiX, FiLock } from 'react-icons/fi'

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
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showCoverModal, setShowCoverModal] = useState(false)
  
  // Settings form state - common
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  
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
      // Сначала загружаем профиль, потом остальные данные
      fetchProfile()
      if (currentUser) {
    checkFollowing()
    }
    }
  }, [params.id, currentUser])

  useEffect(() => {
    // Загружаем справочные данные только один раз
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

      // Загружаем связанные данные последовательно, чтобы не перегружать сервер
      await fetchSelections()
      
      // Загружаем данные в зависимости от роли
      if (userData.role === 'master') {
        await fetchPortfolio()
      } else if (userData.role === 'seller') {
        await fetchSellerProducts()
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

  const handleStartChat = async () => {
    if (!currentUser || !profile) return

    try {
      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${currentUser.id})`)
        .maybeSingle()

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`)
        return
      }

      // Create new chat
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user1_id: currentUser.id,
          user2_id: profile.id,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/chats/${data.id}`)
    } catch (error) {
      console.error('Error starting chat:', error)
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

  // Удален дублирующий useEffect - данные загружаются внутри fetchProfile()

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение')
      return
    }

    setUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}/avatar-${Date.now()}.${fileExt}`

      // Загружаем в product-images bucket (можно создать отдельный bucket для профилей)
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert(`Ошибка при загрузке: ${uploadError.message}`)
        return
      }

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
      const avatarUrl = urlData.publicUrl

      // Обновляем профиль
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentUser.id)

      if (updateError) throw updateError

      // Обновляем локальное состояние
      setProfile({ ...profile, avatar_url: avatarUrl } as User)
      alert('Аватарка успешно обновлена!')
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Ошибка при загрузке аватарки')
    } finally {
      setUploadingAvatar(false)
      e.target.value = '' // Сбрасываем input
    }
  }

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение')
      return
    }

    setUploadingCover(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}/cover-${Date.now()}.${fileExt}`

      // Загружаем в product-images bucket
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        alert(`Ошибка при загрузке: ${uploadError.message}`)
        return
      }

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
      const coverUrl = urlData.publicUrl

      // Обновляем профиль
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_photo_url: coverUrl })
        .eq('id', currentUser.id)

      if (updateError) throw updateError

      // Обновляем локальное состояние
      setProfile({ ...profile, cover_photo_url: coverUrl } as User)
      alert('Фоновая картинка успешно обновлена!')
    } catch (error) {
      console.error('Error uploading cover photo:', error)
      alert('Ошибка при загрузке фоновой картинки')
    } finally {
      setUploadingCover(false)
      e.target.value = '' // Сбрасываем input
    }
  }

  const handleDeleteAvatar = async () => {
    if (!currentUser || !profile || !profile.avatar_url) return
    if (!confirm('Вы уверены, что хотите удалить аватарку?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', currentUser.id)

      if (error) throw error

      setProfile({ ...profile, avatar_url: undefined } as User)
      alert('Аватарка успешно удалена!')
    } catch (error) {
      console.error('Error deleting avatar:', error)
      alert('Ошибка при удалении аватарки')
    }
  }

  const handleDeleteCoverPhoto = async () => {
    if (!currentUser || !profile || !profile.cover_photo_url) return
    if (!confirm('Вы уверены, что хотите удалить фоновую картинку?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ cover_photo_url: null })
        .eq('id', currentUser.id)

      if (error) throw error

      setProfile({ ...profile, cover_photo_url: undefined } as User)
      alert('Фоновая картинка успешно удалена!')
    } catch (error) {
      console.error('Error deleting cover photo:', error)
      alert('Ошибка при удалении фоновой картинки')
    }
  }

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    setPasswordError('')
    setPasswordSuccess('')

    // Валидация
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Все поля обязательны для заполнения')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Новый пароль должен содержать минимум 6 символов')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Новые пароли не совпадают')
      return
    }

    setChangingPassword(true)
    try {
      // Проверяем текущий пароль, пытаясь войти с ним
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      })

      if (signInError) {
        setPasswordError('Текущий пароль неверен')
        setChangingPassword(false)
        return
      }

      // Обновляем пароль
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      setPasswordSuccess('Пароль успешно изменен!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      // Очищаем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setPasswordSuccess('')
      }, 3000)
    } catch (error: any) {
      console.error('Error changing password:', error)
      setPasswordError(error.message || 'Ошибка при изменении пароля')
    } finally {
      setChangingPassword(false)
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
    <div className="min-h-screen bg-bg-primary pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border-color">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 font-medium text-base transition-colors border-b-2 ${
                activeTab === 'profile'
                  ? 'border-brand-accent text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Профиль
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 font-medium text-base transition-colors border-b-2 ${
                  activeTab === 'settings'
                    ? 'border-brand-accent text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Настройки
              </button>
            )}
          </div>

          {/* Profile Tab Content */}
          {activeTab === 'profile' && (
            <>
              {/* Cover Photo and Avatar */}
              <div className="relative mb-6 rounded-lg overflow-hidden" style={{ height: '250px' }}>
                {profile.cover_photo_url ? (
                  <img
                    src={profile.cover_photo_url}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                )}
                
                {/* Avatar positioned on cover photo */}
                <div className="absolute bottom-4 left-6">
                  <div className="w-32 h-32 bg-text-primary border-4 border-white flex items-center justify-center text-white text-4xl font-semibold rounded-full shadow-lg">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      profile.full_name[0]?.toUpperCase() || '?'
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Info Card */}
              <div className="card mb-6 mt-20">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <h1 className="text-2xl font-semibold text-text-primary">{profile.full_name}</h1>
                      <span className="text-xl">
                        {roleEmoji[profile.role as keyof typeof roleEmoji]}
                      </span>
                      <span className="px-3 py-1 border border-border-color text-text-primary text-xs font-normal rounded-lg bg-bg-secondary">
                        {roleLabels[profile.role as keyof typeof roleLabels]}
                      </span>
                      {!isOwnProfile && (
                        <>
                          {profile.role !== 'client' && (
                            <button
                              onClick={toggleFollow}
                              disabled={followLoading}
                              className={`ml-2 px-4 py-1.5 text-sm border rounded-lg transition-colors ${
                                isFollowing ? 'bg-brand-accent text-white border-brand-accent' : 'bg-bg-primary text-text-primary border-border-color hover:border-brand-accent'
                              }`}
                            >
                              {followLoading ? '...' : isFollowing ? 'Отписаться' : 'Подписаться'}
                            </button>
                          )}
                          <button
                            onClick={handleStartChat}
                            className="ml-2 px-4 py-1.5 text-sm border border-brand-accent text-brand-accent rounded-lg transition-colors hover:bg-brand-accent hover:text-white flex items-center gap-1.5"
                          >
                            <FiMessageCircle size={14} />
                            Написать
                          </button>
                        </>
                      )}
                    </div>
                    {profile.description && (
                      <p className="text-text-secondary mb-4 text-base leading-relaxed">{profile.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
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
                  <div className="mt-6 pt-6 border-t border-border-color">
                    {profileSpecializations.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-text-primary">
                          <FiBriefcase size={16} />
                          <span>Специализации</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profileSpecializations.map((spec) => (
                            <span
                              key={spec.id}
                              className="px-3 py-1 bg-bg-secondary border border-border-color text-xs font-normal text-text-primary rounded-lg"
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
                          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-text-primary">
                            <FiBriefcase size={16} />
                            <span>Описание услуг</span>
                          </div>
                          <p className="text-sm text-text-secondary leading-relaxed">{profile.services}</p>
                        </div>
                      )}
                      {profile.service_location && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-text-primary">
                            <FiHome size={16} />
                            <span>Место обслуживания</span>
                          </div>
                          <p className="text-sm text-text-secondary">
                            {profile.service_location === 'home' && 'Выезд на дом'}
                            {profile.service_location === 'workshop' && 'В мастерской'}
                            {profile.service_location === 'both' && 'Выезд и в мастерской'}
                          </p>
                        </div>
                      )}
                      {profile.experience_years && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-text-primary">
                            <FiBriefcase size={16} />
                            <span>Опыт работы</span>
                          </div>
                          <p className="text-sm text-text-secondary">{profile.experience_years} {profile.experience_years === 1 ? 'год' : profile.experience_years < 5 ? 'года' : 'лет'}</p>
                        </div>
                      )}
                      {profile.work_schedule && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-text-primary">
                            <FiClock size={16} />
                            <span>График работы</span>
                          </div>
                          <p className="text-sm text-text-secondary">{profile.work_schedule}</p>
                        </div>
                      )}
                    </div>

                    {profileServices.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-text-primary">
                          <FiBriefcase size={16} />
                          <span>Выбранные услуги</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profileServices.map((svc) => (
                            <span
                              key={svc.id}
                              className="px-3 py-1 bg-bg-secondary border border-border-color text-xs font-normal text-text-primary rounded-lg"
                            >
                              {svc.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profileSpecializations.length === 0 && profile.specialization && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-text-primary">
                          <FiBriefcase size={16} />
                          <span>Специализация</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profile.specialization.split(',').map((spec, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-bg-secondary border border-border-color text-xs font-normal text-text-primary rounded-lg"
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
                    <h2 className="text-xl font-semibold text-text-primary">Товары продавца</h2>
                    {isOwnProfile && (
                      <Link
                        href="/products/new"
                        className="btn btn-primary text-sm"
                      >
                        Добавить товар
                      </Link>
                    )}
                  </div>
                  {products.length === 0 ? (
                    <div className="card text-center text-text-secondary py-10">
                      Пока нет товаров
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {products.map((product) => {
                        const thumb = product.images && product.images.length > 0 ? product.images[0] : ''
                        return (
                          <Link
                            key={product.id}
                            href={`/products/${product.id}`}
                            className="card hover:shadow-card-hover transition flex gap-4 items-center"
                          >
                            <div className="w-20 h-20 bg-bg-secondary border border-border-color flex items-center justify-center overflow-hidden rounded-lg">
                              {thumb ? (
                                <img src={thumb} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-3xl">🛒</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-base font-semibold text-text-primary line-clamp-1">
                                {product.name}
                              </div>
                              <div className="text-xl font-semibold text-brand-accent mt-1">
                                {product.price.toLocaleString('ru-RU')} ₽
                              </div>
                              <div className="text-sm text-text-secondary line-clamp-2 mt-1">
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
                    <h2 className="text-xl font-semibold text-text-primary">Портфолио</h2>
                    <div className="flex items-center gap-2">
                      {isOwnProfile && (
                        <Link
                          href="/portfolio/new"
                          className="btn btn-primary text-sm flex items-center gap-1.5"
                        >
                          <FiPlus size={14} />
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
              <h1 className="text-xl font-semibold mb-6 text-text-primary">Настройки</h1>

              {/* Image Upload Section */}
              <div className="mb-8 pb-8 border-b border-border-color">
                <h2 className="text-lg font-semibold mb-4 text-text-primary">Изображения профиля</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Avatar Upload */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      Аватарка
                  </label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-text-primary border-2 border-border-color flex items-center justify-center text-white text-xl font-semibold rounded-full flex-shrink-0">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name}
                            className="w-full h-full object-cover rounded-full"
                  />
                        ) : (
                          profile.full_name[0]?.toUpperCase() || '?'
                        )}
                </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => setShowAvatarModal(true)}
                          disabled={uploadingAvatar}
                          className="btn btn-primary inline-flex items-center gap-2"
                        >
                          <FiCamera size={16} />
                          <span>{uploadingAvatar ? 'Загрузка...' : 'Изменить'}</span>
                        </button>
                </div>
                    </div>
                </div>

                  {/* Cover Photo Upload */}
                      <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      Фоновая картинка
                        </label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-12 bg-bg-secondary border border-border-color rounded overflow-hidden flex-shrink-0">
                        {profile.cover_photo_url ? (
                          <img
                            src={profile.cover_photo_url}
                            alt="Cover"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <FiCamera size={16} className="text-text-secondary" />
                      </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => setShowCoverModal(true)}
                          disabled={uploadingCover}
                          className="btn btn-primary inline-flex items-center gap-2"
                        >
                          <FiCamera size={16} />
                          <span>{uploadingCover ? 'Загрузка...' : 'Изменить'}</span>
                        </button>
                      </div>
                        </div>
                      </div>
                        </div>
                      </div>

              {/* Password Change Section */}
              <div className="mb-8 pb-8 border-b border-border-color">
                <h2 className="text-lg font-semibold mb-4 text-text-primary">Изменение пароля</h2>
                <p className="text-sm text-text-secondary mb-4">
                  Пароль хранится в зашифрованном виде и не может быть просмотрен. Вы можете изменить его, указав текущий пароль.
                </p>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      Текущий пароль *
                        </label>
                        <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="input w-full"
                      placeholder="Введите текущий пароль"
                      disabled={changingPassword}
                      required
                        />
                      </div>
                      
                      <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      Новый пароль *
                        </label>
                        <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input w-full"
                      placeholder="Минимум 6 символов"
                      disabled={changingPassword}
                      required
                      minLength={6}
                        />
                      </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      Подтвердите новый пароль *
                        </label>
                        <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input w-full"
                      placeholder="Повторите новый пароль"
                      disabled={changingPassword}
                      required
                      minLength={6}
                        />
                      </div>

                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {passwordError}
                        </div>
                      )}

                  {passwordSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                      {passwordSuccess}
                      </div>
                )}

                  <button
                    type="submit"
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <FiLock size={16} />
                    <span>{changingPassword ? 'Изменение...' : 'Изменить пароль'}</span>
                  </button>
              </form>
            </div>

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

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
          onClick={() => setShowAvatarModal(false)}
        >
          <div
            className="bg-bg-primary border border-border-color rounded-lg shadow-card p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-text-primary">Аватарка</h3>
            <div className="flex flex-col gap-3">
              <label className="btn btn-primary cursor-pointer inline-flex items-center justify-center gap-2">
                <FiCamera size={16} />
                <span>{uploadingAvatar ? 'Загрузка...' : 'Изменить'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleAvatarUpload(e)
                    setShowAvatarModal(false)
                  }}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
              {profile?.avatar_url && (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteAvatar()
                    setShowAvatarModal(false)
                  }}
                  disabled={uploadingAvatar}
                  className="btn bg-red-500 hover:bg-red-600 text-white border-red-500 inline-flex items-center justify-center gap-2"
                >
                  <FiX size={16} />
                  <span>Удалить</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="btn bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-color"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cover Photo Modal */}
      {showCoverModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
          onClick={() => setShowCoverModal(false)}
        >
          <div
            className="bg-bg-primary border border-border-color rounded-lg shadow-card p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-text-primary">Фоновая картинка</h3>
            <div className="flex flex-col gap-3">
              <label className="btn btn-primary cursor-pointer inline-flex items-center justify-center gap-2">
                <FiCamera size={16} />
                <span>{uploadingCover ? 'Загрузка...' : 'Изменить'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleCoverPhotoUpload(e)
                    setShowCoverModal(false)
                  }}
                  disabled={uploadingCover}
                  className="hidden"
                />
              </label>
              {profile?.cover_photo_url && (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteCoverPhoto()
                    setShowCoverModal(false)
                  }}
                  disabled={uploadingCover}
                  className="btn bg-red-500 hover:bg-red-600 text-white border-red-500 inline-flex items-center justify-center gap-2"
                >
                  <FiX size={16} />
                  <span>Удалить</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCoverModal(false)}
                className="btn bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-color"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


