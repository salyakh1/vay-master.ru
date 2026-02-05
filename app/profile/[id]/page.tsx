'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuth } from '@/app/providers'
import { supabase, User, PortfolioItem, Service, Product } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import PortfolioGrid from '@/components/PortfolioGrid'

// Dynamic import для галереи портфолио - загружается только при открытии
const PortfolioGallery = dynamic(() => import('@/components/PortfolioGallery'), {
  ssr: false,
})
import { FiMapPin, FiPhone, FiMail, FiPlus, FiBriefcase, FiClock, FiHome, FiMessageCircle, FiCamera, FiX, FiLock, FiArrowLeft, FiLogOut, FiUser, FiShield, FiHeart, FiShoppingBag, FiChevronDown, FiChevronUp, FiSend } from 'react-icons/fi'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import AuthRequiredModal from '@/components/AuthRequiredModal'
import AdSlot from '@/components/AdSlot'
import ReviewCard from '@/components/ReviewCard'
import ReviewForm from '@/components/ReviewForm'
import ReviewReplyForm from '@/components/ReviewReplyForm'
import RatingStars from '@/components/RatingStars'
import StoriesCircle from '@/components/StoriesCircle'
import SellerAddressPicker from '@/components/SellerAddressPicker'
import MasterRadiusPicker from '@/components/MasterRadiusPicker'
import StoreLocationMapModal from '@/components/StoreLocationMapModal'

const StoresMap = dynamic(() => import('@/components/StoresMap'), { ssr: false })

// Dynamic import для создания истории - загружается только при открытии
const CreateStory = dynamic(() => import('@/components/CreateStory'), {
  ssr: false,
})

import { Story } from '@/lib/supabase'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: currentUser, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState<number | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile')
  const [settingsTab, setSettingsTab] = useState<'edit' | 'specializations' | 'security' | 'account'>('edit')
  const [adminRole, setAdminRole] = useState<string | null>(null)
  type TreeCategory = { id: string; name: string; slug: string; sort_order: number; subcategories: Array<{ id: string; name: string; slug: string; sort_order: number; services: Array<{ id: string; name: string; slug: string; sort_order: number }> }> }
  const [tree, setTree] = useState<TreeCategory[]>([])
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [profileSubcategories, setProfileSubcategories] = useState<Array<{ id: string; name: string; slug: string; category?: { id: string; name: string; slug: string } }>>([])
  const [profileServices, setProfileServices] = useState<Service[]>([])
  const [isFollowing, setIsFollowing] = useState<boolean>(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followersCount, setFollowersCount] = useState<number>(0)
  const [productsCount, setProductsCount] = useState<number>(0)
  const [masterReviews, setMasterReviews] = useState<any[]>([])
  const [sellerReviews, setSellerReviews] = useState<any[]>([]) // Прямые отзывы о продавце
  const [productReviews, setProductReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [editingReview, setEditingReview] = useState<any>(null)
  const [replyingToReview, setReplyingToReview] = useState<string | null>(null)
  const [reviewsExpanded, setReviewsExpanded] = useState(false)
  const [specializationsExpanded, setSpecializationsExpanded] = useState(false)
  const [quickReviewRating, setQuickReviewRating] = useState(0)
  const [quickReviewText, setQuickReviewText] = useState('')
  const [sendingQuickReview, setSendingQuickReview] = useState(false)
  const [existingUserReview, setExistingUserReview] = useState<any>(null)
  const [profileStories, setProfileStories] = useState<Story[]>([])
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showCoverModal, setShowCoverModal] = useState(false)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  
  // Render-on-Demand: состояния для отслеживания загрузки данных по секциям
  const [portfolioFetched, setPortfolioFetched] = useState(false)
  const [reviewsFetched, setReviewsFetched] = useState(false)
  const [portfolioPage, setPortfolioPage] = useState(1)
  const [portfolioHasMore, setPortfolioHasMore] = useState(false)
  const [loadingMorePortfolio, setLoadingMorePortfolio] = useState(false)
  const [productsPage, setProductsPage] = useState(1)
  const [productsHasMore, setProductsHasMore] = useState(false)
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false)
  const portfolioSectionRef = useRef<HTMLDivElement>(null)
  const reviewsSectionRef = useRef<HTMLDivElement>(null)
  const portfolioLoadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const productsLoadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const PROFILE_ITEMS_PER_PAGE = 12
  
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
  const [showStoresMap, setShowStoresMap] = useState(false)
  const [showStoreLocationMap, setShowStoreLocationMap] = useState(false)
  const [showCatalogModal, setShowCatalogModal] = useState(false)
  const [workHours, setWorkHours] = useState('')
  const [deliveryAvailable, setDeliveryAvailable] = useState(false)
  const [deliveryZones, setDeliveryZones] = useState('')
  const [productCategories, setProductCategories] = useState('')

  useEffect(() => {
    if (params.id) {
      // Render-on-Demand: сбрасываем состояния при смене профиля
      setPortfolioFetched(false)
      setReviewsFetched(false)
      setPortfolioItems([])
      setMasterReviews([])
      setProductReviews([])
      
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

  // Render-on-Demand: Intersection Observer для секции портфолио (только для мастеров)
  useEffect(() => {
    if (!profile || profile.role !== 'master' || portfolioFetched || !portfolioSectionRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !portfolioFetched) {
            setPortfolioFetched(true)
            fetchPortfolio()
            observer.disconnect()
          }
        })
      },
      { rootMargin: '200px' } // Загружаем за 200px до появления секции
    )

    observer.observe(portfolioSectionRef.current)

    return () => {
      observer.disconnect()
    }
  }, [profile, portfolioFetched])

  // Render-on-Demand: Intersection Observer для секции отзывов
  useEffect(() => {
    if (!profile || reviewsFetched || !reviewsSectionRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !reviewsFetched) {
            setReviewsFetched(true)
            const profileId = Array.isArray(params.id) ? params.id[0] : params.id
            if (profileId) {
              if (profile.role === 'master') {
                fetchMasterReviews(profileId)
              } else if (profile.role === 'seller') {
                // Загружаем и прямые отзывы о продавце, и отзывы о товарах
                fetchSellerReviews(profileId)
                fetchProductReviews(profileId)
              }
            }
            observer.disconnect()
          }
        })
      },
      { rootMargin: '200px' } // Загружаем за 200px до появления секции
    )

    observer.observe(reviewsSectionRef.current)

    return () => {
      observer.disconnect()
    }
  }, [profile, reviewsFetched, params.id])

  // Открытие галереи портфолио по openPortfolio из URL (из /activity)
  useEffect(() => {
    const op = searchParams.get('openPortfolio')
    if (!op || !profile || profile.role !== 'master') return
    setPortfolioFetched(true)
    fetchPortfolio()
  }, [searchParams, profile?.id, profile?.role])

  useEffect(() => {
    const op = searchParams.get('openPortfolio')
    if (!op || portfolioItems.length === 0) return
    const idx = portfolioItems.findIndex((i: PortfolioItem) => i.id === op)
    if (idx >= 0) setSelectedPortfolioIndex(idx)
  }, [searchParams, portfolioItems])

  // Бесконечный скролл: портфолио
  useEffect(() => {
    const el = portfolioLoadMoreSentinelRef.current
    if (!el || !portfolioHasMore || loadingMorePortfolio) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMorePortfolio() },
      { rootMargin: '300px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [portfolioHasMore, loadingMorePortfolio, portfolioPage, portfolioItems.length])

  // Бесконечный скролл: товары продавца
  useEffect(() => {
    const el = productsLoadMoreSentinelRef.current
    if (!el || !productsHasMore || loadingMoreProducts) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMoreProducts() },
      { rootMargin: '300px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [productsHasMore, loadingMoreProducts, productsPage, products.length])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        // Если профиль не найден, устанавливаем profile в null
        setProfile(null)
        setLoading(false)
        return
      }
      
      if (!data) {
        setProfile(null)
        setLoading(false)
        return
      }
      
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

      const profileId = Array.isArray(params.id) ? params.id[0] : params.id
      
      // Сначала загружаем критичные данные для первого экрана
      // Админская роль
      const { data: adminRoleData } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', params.id)
        .eq('is_active', true)
        .maybeSingle()
      if (adminRoleData) {
        setAdminRole(adminRoleData.role)
      } else {
        setAdminRole(null)
      }
      
      // Специализации и услуги
      await fetchSelections()
      
      // Истории профиля (для всех ролей) — нужны для шапки
      if (profileId) {
        await fetchProfileStories(profileId)
      }

      // Первый экран готов: показываем контент
      setLoading(false)

      // Портфолио, отзывы, товары — после первого рендера (idle), не блокируем LCP
      const scheduleHeavy = () => {
        if (userData.role === 'master' && profileId) {
          fetchPortfolio().then(() => fetchMasterReviews(profileId))
        } else if (userData.role === 'seller' && profileId) {
          fetchSellerProducts()
          fetchSellerStats(profileId)
          fetchProductReviews(profileId)
        }
      }
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(scheduleHeavy, { timeout: 600 })
      } else {
        setTimeout(scheduleHeavy, 600)
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
      const profileId = Array.isArray(params.id) ? params.id[0] : params.id
      if (!profileId) return
      
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profileId)
        .maybeSingle()
      if (error) throw error
      setIsFollowing(!!data)
    } catch (error) {
      console.error('Error checking follow status:', error)
      setIsFollowing(false)
    }
  }

  const fetchReferenceData = async () => {
    try {
      const res = await fetch('/api/master-categories/tree')
      const data = await res.json().catch(() => ({}))
      setTree((data?.tree as TreeCategory[]) || [])
    } catch (error) {
      console.error('Error fetching reference data:', error)
    }
  }

  const fetchSelections = async () => {
    if (!params.id) return
    try {
      const [{ data: subSel, error: subSelError }, { data: svcSel, error: svcSelError }] = await Promise.all([
        supabase
          .from('profile_subcategories')
          .select('subcategory:subcategories(id, name, slug, category:categories(id, name, slug))')
          .eq('profile_id', params.id),
        supabase
          .from('profile_services')
          .select('service:services(id, name, slug, subcategory_id)')
          .eq('profile_id', params.id),
      ])

      if (subSelError) throw subSelError
      if (svcSelError) throw svcSelError

      const subs = ((subSel as any[]) || [])
        .map((item) => item.subcategory && { ...item.subcategory, category: (item.subcategory as any).category })
        .filter(Boolean) as typeof profileSubcategories
      const svcs = ((svcSel as any[]) || [])
        .map((item) => item.service as Service)
        .filter(Boolean)

      setProfileSubcategories(subs)
      setProfileServices(svcs)
      setSelectedSubcategoryIds(subs.map((s) => s.id))
      setSelectedServiceIds(svcs.map((s) => s.id))
    } catch (error) {
      console.error('Error fetching selections:', error)
    }
  }

  const toggleSubcategory = (id: string) => {
    setSelectedSubcategoryIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      setSelectedServiceIds((prevSvc) =>
        prevSvc.filter((svcId) => {
          const sub = tree.flatMap((c) => c.subcategories).find((s) => s.services.some((v) => v.id === svcId))
          return !sub || next.includes(sub.id)
        })
      )
      return next
    })
  }

  const toggleService = (id: string) => {
    const sub = tree.flatMap((c) => c.subcategories).find((s) => s.services.some((v) => v.id === id))
    if (sub && !selectedSubcategoryIds.includes(sub.id)) {
      setSelectedSubcategoryIds((prev) => [...prev, sub.id])
    }
    setSelectedServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const syncSelections = async (profileId: string) => {
    try {
      await supabase.from('profile_subcategories').delete().eq('profile_id', profileId)
      if (selectedSubcategoryIds.length > 0) {
        await supabase.from('profile_subcategories').insert(
          selectedSubcategoryIds.map((subId) => ({ profile_id: profileId, subcategory_id: subId }))
        )
      }
      await supabase.from('profile_services').delete().eq('profile_id', profileId)
      if (selectedServiceIds.length > 0) {
        await supabase.from('profile_services').insert(
          selectedServiceIds.map((svcId) => ({ profile_id: profileId, service_id: svcId }))
        )
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
      // Обновляем статистику подписчиков после изменения подписки
      if (profile.role === 'seller') {
        await fetchSellerStats(profile.id)
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


  const fetchPortfolio = async (append: boolean = false) => {
    const profileId = Array.isArray(params.id) ? params.id[0] : params.id
    if (!profileId) return
    if (!append) setPortfolioFetched(true)
    else setLoadingMorePortfolio(true)
    try {
      const page = append ? portfolioPage : 1
      const from = (page - 1) * PROFILE_ITEMS_PER_PAGE
      const to = from + PROFILE_ITEMS_PER_PAGE - 1
      const { data, error, count } = await supabase
        .from('portfolio_items')
        .select('*, master:profiles(id, full_name, avatar_url, role)', { count: 'exact' })
        .eq('master_id', profileId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      const list = (data as PortfolioItem[]) || []
      setPortfolioHasMore(list.length === PROFILE_ITEMS_PER_PAGE && (count ?? 0) > page * PROFILE_ITEMS_PER_PAGE)
      if (append) {
        setPortfolioItems((prev) => [...prev, ...list])
        setPortfolioPage((p) => p + 1)
      } else {
        setPortfolioItems(list)
        setPortfolioPage(2)
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error)
    } finally {
      setLoadingMorePortfolio(false)
    }
  }

  const loadMorePortfolio = () => {
    if (!loadingMorePortfolio && portfolioHasMore) fetchPortfolio(true)
  }

  const fetchSellerProducts = async (append: boolean = false) => {
    const profileId = Array.isArray(params.id) ? params.id[0] : params.id
    if (!profileId) return
    if (append) setLoadingMoreProducts(true)
    try {
      const page = append ? productsPage : 1
      const from = (page - 1) * PROFILE_ITEMS_PER_PAGE
      const to = from + PROFILE_ITEMS_PER_PAGE - 1
      const { data, error, count } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles(id, full_name, avatar_url, city),
          category_ref:product_categories(id, name, section)
        `, { count: 'exact' })
        .eq('seller_id', profileId)
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      const list = (data as Product[]) || []
      setProductsHasMore(list.length === PROFILE_ITEMS_PER_PAGE && (count ?? 0) > page * PROFILE_ITEMS_PER_PAGE)
      if (append) {
        setProducts((prev) => [...prev, ...list])
        setProductsPage((p) => p + 1)
      } else {
        setProducts(list)
        setProductsPage(2)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      if (!append) setProducts([])
    } finally {
      setLoadingMoreProducts(false)
    }
  }

  const loadMoreProducts = () => {
    if (!loadingMoreProducts && productsHasMore) fetchSellerProducts(true)
  }

  const fetchSellerStats = async (sellerId: string) => {
    try {
      // Получаем количество подписчиков
      const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', sellerId)
      
      if (followersError) {
        console.error('Error fetching followers count:', followersError)
      }
      
      // Получаем количество товаров
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
      
      if (productsError) {
        console.error('Error fetching products count:', productsError)
      }
      
      // Получаем количество отзывов о продавце (из отзывов о товарах)
      const { count: reviewsCount, error: reviewsError } = await supabase
        .from('product_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
      
      if (reviewsError) {
        console.error('Error fetching reviews count:', reviewsError)
      }
      
      setFollowersCount(followersCount ?? 0)
      setProductsCount(productsCount ?? 0)
      
      // Обновляем статистику в профиле (для отображения)
      if (profile && profile.role === 'seller') {
        setProfile({
          ...profile,
          seller_reviews_count: reviewsCount ?? 0,
        })
      }
    } catch (error) {
      console.error('Error fetching seller stats:', error)
      setFollowersCount(0)
      setProductsCount(0)
    }
  }

  const fetchMasterReviews = async (masterId: string) => {
    try {
      setReviewsLoading(true)
      const { data, error } = await supabase
        .from('master_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id(id, full_name, avatar_url, role)
        `)
        .eq('master_id', masterId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Получаем ответы на отзывы
      const reviewIds = data?.map(r => r.id) || []
      if (reviewIds.length > 0) {
        const { data: replies } = await supabase
          .from('review_replies')
          .select(`
            *,
            author:profiles!author_id(id, full_name, avatar_url)
          `)
          .eq('review_type', 'master')
          .in('review_id', reviewIds)
          .order('created_at', { ascending: true })

        const repliesMap = new Map<string, any[]>()
        replies?.forEach(reply => {
          if (!repliesMap.has(reply.review_id)) {
            repliesMap.set(reply.review_id, [])
          }
          repliesMap.get(reply.review_id)!.push(reply)
        })

      const reviewsWithReplies = data?.map(review => ({
        ...review,
        replies: repliesMap.get(review.id) || []
      })) || []

        setMasterReviews(reviewsWithReplies)
        
        // Проверяем, есть ли отзыв от текущего пользователя
        if (currentUser) {
          const userReview = reviewsWithReplies.find((r: any) => r.reviewer_id === currentUser.id)
          if (userReview) {
            setExistingUserReview(userReview)
            // Предзаполняем форму редактирования
            setQuickReviewRating(userReview.rating)
            setQuickReviewText(userReview.comment || '')
          } else {
            setExistingUserReview(null)
            setQuickReviewRating(0)
            setQuickReviewText('')
          }
        }
      } else {
        setMasterReviews([])
        setExistingUserReview(null)
        setQuickReviewRating(0)
        setQuickReviewText('')
      }
    } catch (error) {
      console.error('Error fetching master reviews:', error)
      setMasterReviews([])
      setExistingUserReview(null)
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchProfileStories = async (userId: string) => {
    try {
      const params = new URLSearchParams({
        userId: userId,
        ...(currentUser?.id && { currentUserId: currentUser.id }),
      })
      const response = await fetch(`/api/stories?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch stories')
      const data = await response.json()
      setProfileStories(data.stories || [])
    } catch (error) {
      console.error('Error fetching profile stories:', error)
      setProfileStories([])
    }
  }

  const fetchSellerReviews = async (sellerId: string) => {
    try {
      setReviewsLoading(true)
      // Получаем прямые отзывы о продавце (аналогично master_reviews)
      const { data, error } = await supabase
        .from('seller_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id(id, full_name, avatar_url, role),
          seller:profiles!seller_id(id, full_name)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Получаем ответы на отзывы
      const reviewIds = data?.map(r => r.id) || []
      if (reviewIds.length > 0) {
        const { data: replies } = await supabase
          .from('review_replies')
          .select(`
            *,
            author:profiles!author_id(id, full_name, avatar_url)
          `)
          .eq('review_type', 'seller')
          .in('review_id', reviewIds)
          .order('created_at', { ascending: true })

        const repliesMap = new Map<string, any[]>()
        replies?.forEach(reply => {
          if (!repliesMap.has(reply.review_id)) {
            repliesMap.set(reply.review_id, [])
          }
          repliesMap.get(reply.review_id)!.push(reply)
        })

        const reviewsWithReplies = data?.map(review => ({
          ...review,
          replies: repliesMap.get(review.id) || []
        })) || []

        setSellerReviews(reviewsWithReplies)
      } else {
        setSellerReviews([])
      }
    } catch (error) {
      console.error('Error fetching seller reviews:', error)
      setSellerReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchProductReviews = async (sellerId: string) => {
    try {
      setReviewsLoading(true)
      // Получаем все отзывы о товарах продавца
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          *,
          reviewer:profiles!reviewer_id(id, full_name, avatar_url, role),
          product:products!product_id(id, name)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Получаем ответы на отзывы
      const reviewIds = data?.map(r => r.id) || []
      if (reviewIds.length > 0) {
        const { data: replies } = await supabase
          .from('review_replies')
          .select(`
            *,
            author:profiles!author_id(id, full_name, avatar_url)
          `)
          .eq('review_type', 'product')
          .in('review_id', reviewIds)
          .order('created_at', { ascending: true })

        const repliesMap = new Map<string, any[]>()
        replies?.forEach(reply => {
          if (!repliesMap.has(reply.review_id)) {
            repliesMap.set(reply.review_id, [])
          }
          repliesMap.get(reply.review_id)!.push(reply)
        })

        const reviewsWithReplies = data?.map(review => ({
          ...review,
          replies: repliesMap.get(review.id) || []
        })) || []

        setProductReviews(reviewsWithReplies)
      } else {
        setProductReviews([])
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error)
      setProductReviews([])
    } finally {
      setReviewsLoading(false)
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
        description: description || null,
      }
      // Город только для не-продавцов: у продавца локация задаётся адресом магазина
      if (profile.role !== 'seller') {
        updateData.city = city || null
      }

      // Add master-specific fields
      if (profile.role === 'master') {
        updateData.services = servicesText || null
        updateData.service_location = serviceLocation || null
        updateData.experience_years = experienceYears ? Number(experienceYears) : null
        updateData.specialization = specialization || null
        updateData.work_schedule = workSchedule || null
      }

      // Add seller-specific fields (город для продавца не из формы — только адрес магазина)
      if (profile.role === 'seller') {
        updateData.store_address = storeAddress || null
        // city для продавца не обновляем из формы — локация задаётся адресом магазина
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

  if (!profile) {
    // Если профиль не загружен и пользователь не авторизован, показываем модальное окно
    if (!authLoading && !currentUser && !loading) {
      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center">
          <AuthRequiredModal 
            isOpen={true} 
            onClose={() => router.push('/')} 
            type="master"
          />
        </div>
      )
    }
    // Показываем загрузку, если профиль еще загружается
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }
  
  // Если профиль загружен, но пользователь не авторизован (просматривает чужой профиль)
  // Это нормально, просто не показываем кнопки редактирования

  const roleLabels = {
    master: 'Мастер',
    seller: 'Продавец',
    client: 'Клиент',
    super_admin: 'Администратор',
    moderator: 'Модератор',
    support: 'Поддержка',
  }

  const roleEmoji = {
    master: '🔨',
    seller: '🛒',
    client: '👤',
    super_admin: '',
    moderator: '🛡️',
    support: '💬',
  }

  // Определяем, какую роль показывать: админскую или из профиля
  const displayRole = adminRole || profile.role

  const isOwnProfile = currentUser?.id === profile.id
  const filteredServices = tree.flatMap((c) => c.subcategories.flatMap((s) => s.services.map((v) => ({ ...v, subcategory_id: s.id })))).filter((svc: any) => selectedSubcategoryIds.includes(svc.subcategory_id))

  const returnTo = searchParams.get('returnTo')

  return (
    <div className="min-h-screen bg-bg-primary pb-20">
      {currentUser && <Navbar />}
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        <div className="w-full max-w-full sm:max-w-2xl md:max-w-4xl mx-auto">
          {/* Back to Responses Button */}
          {returnTo && (
            <div className="mb-4">
              <button
                onClick={() => router.push(returnTo)}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors font-medium"
              >
                <FiArrowLeft size={18} />
                <span>Назад к откликам</span>
              </button>
            </div>
          )}
          {/* Tabs */}
          <div className="flex gap-1 sm:gap-2 mb-6 sm:mb-8 border-b border-border-color/40 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'profile'
                  ? 'border-brand-accent text-graphite-secondary'
                  : 'border-transparent text-text-secondary hover:text-graphite-secondary'
              }`}
            >
              Профиль
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'settings'
                    ? 'border-brand-accent text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Настройки
              </button>
            )}
            {isOwnProfile && (currentUser?.role === 'master' || currentUser?.role === 'seller') && (
              <button
                onClick={() => router.push('/pro')}
                className="px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base transition-colors border-b-2 whitespace-nowrap flex-shrink-0 border-transparent text-brand-accent hover:text-brand-accent-hover"
              >
                PRO / Подписка
              </button>
            )}
          </div>

          {/* Profile Tab Content */}
          {activeTab === 'profile' && (
            <>
              {/* Cover Photo and Avatar */}
              <div className="relative mb-8 sm:mb-10 rounded-2xl overflow-hidden h-[200px] sm:h-[250px] group/cover shadow-glossy">
                {profile.cover_photo_url ? (
                  <>
                    <img
                      src={profile.cover_photo_url}
                      alt="Cover"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-transparent opacity-0 group-hover/cover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400" />
                )}
                
                {/* Avatar positioned on cover photo - Глянцевый, премиальный */}
                <div className="absolute bottom-2 sm:bottom-4 left-3 sm:left-6 group/avatar">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-gradient-to-br from-graphite-primary to-graphite-tertiary border-2 sm:border-4 border-white/50 flex items-center justify-center text-white text-2xl sm:text-3xl md:text-4xl font-semibold rounded-full shadow-premium overflow-hidden">
                    {profile.avatar_url ? (
                      <>
                        <Image
                          src={profile.avatar_url}
                          alt={profile.full_name}
                          fill
                          className="object-cover rounded-full transition-all duration-300 group-hover/avatar:scale-110"
                          sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 128px"
                          priority
                        />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      </>
                    ) : (
                      profile.full_name[0]?.toUpperCase() || '?'
                    )}
                    {/* Блик на аватаре */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-full opacity-60"></div>
                  </div>
                </div>
              </div>

              {/* Profile Info Card */}
              <div className="card-glossy mb-8 sm:mb-10 mt-12 sm:mt-16 md:mt-20 w-full">
                <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full px-4 sm:px-5">
                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-semibold text-graphite-secondary tracking-tight">{profile.full_name}</h1>
                      <span className={`px-3 py-1 border text-xs font-medium rounded-md ${
                        adminRole 
                          ? 'border-brand-accent text-brand-accent bg-red-50' 
                          : 'border-border-light text-graphite-secondary bg-bg-secondary'
                      }`}>
                        {roleLabels[displayRole as keyof typeof roleLabels] || roleLabels.client}
                      </span>
                      {!isOwnProfile && (
                        <>
                          {profile.role !== 'client' && (
                            <button
                              onClick={toggleFollow}
                              disabled={followLoading}
                              className={`ml-2 px-4 py-1.5 text-sm border rounded-md transition-colors font-medium ${
                                isFollowing ? 'bg-brand-accent text-white border-brand-accent' : 'bg-bg-primary text-graphite-secondary border-border-light hover:border-brand-accent'
                              }`}
                            >
                              {followLoading ? '...' : isFollowing ? 'Отписаться' : 'Подписаться'}
                            </button>
                          )}
                          <button
                            onClick={handleStartChat}
                            className="ml-0 sm:ml-2 mt-2 sm:mt-0 px-3 sm:px-4 py-1.5 text-sm border border-brand-accent text-brand-accent rounded-md transition-colors hover:bg-brand-accent hover:text-white flex items-center gap-1.5 font-medium"
                          >
                            <FiMessageCircle size={14} strokeWidth={2} />
                            Написать
                          </button>
                        </>
                      )}
                    </div>
                    {profile.description && (
                      <p className="text-text-secondary mb-5 text-base leading-relaxed">{profile.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                      {/* У продавцов адрес только в блоке «Адрес магазина» ниже — здесь не дублируем */}
                      {profile.role !== 'seller' && profile.city && (
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

                {/* Истории профиля (только для мастера/продавца) */}
                {(profile.role === 'master' || profile.role === 'seller') && (
                  <div className="mt-6 px-4 sm:px-5">
                    <StoriesCircle
                      stories={profileStories}
                      currentUser={currentUser}
                      isOwnProfile={isOwnProfile}
                      onStoryCreated={() => {
                        const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                        if (profileId) {
                          fetchProfileStories(profileId)
                        }
                      }}
                    />
                  </div>
                )}

                {/* Master-specific information */}
                {profile.role === 'master' && (
                  <div className="mt-10 pt-8 px-4 sm:px-5 border-t border-border-color/40">
                    <div className="mb-6 border border-border-light rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setSpecializationsExpanded(!specializationsExpanded)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left bg-bg-secondary/50 hover:bg-bg-secondary transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FiBriefcase size={16} className="text-graphite-secondary" />
                          <span className="text-sm font-semibold text-graphite-secondary">Специализации и услуги</span>
                          <span className="text-xs text-text-secondary">
                            {profileSubcategories.length + profileServices.length > 0
                              ? `${profileSubcategories.length} подкат., ${profileServices.length} услуг`
                              : profile.specialization
                                ? 'специализация'
                                : 'пока не выбрано'}
                          </span>
                        </div>
                        {specializationsExpanded ? (
                          <FiChevronUp size={18} className="text-text-secondary" />
                        ) : (
                          <FiChevronDown size={18} className="text-text-secondary" />
                        )}
                      </button>
                      {specializationsExpanded && (
                        <div className="px-4 py-4 bg-white border-t border-border-light">
                          {profileSubcategories.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Специализации</div>
                              <div className="flex flex-wrap gap-2.5">
                                {profileSubcategories.map((spec) => (
                                  <span
                                    key={spec.id}
                                    className="px-3 py-1.5 bg-bg-secondary border border-border-light/60 text-xs font-medium text-graphite-secondary rounded-md"
                                  >
                                    {spec.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {profileServices.length > 0 && (
                            <div className={profileSubcategories.length > 0 ? 'mt-4' : ''}>
                              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Услуги мастера</div>
                              <div className="flex flex-wrap gap-2.5">
                                {profileServices.map((svc) => (
                                  <span
                                    key={svc.id}
                                    className="px-3 py-1.5 bg-bg-secondary border border-border-light/60 text-xs font-medium text-graphite-secondary rounded-md"
                                  >
                                    {svc.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {profileSubcategories.length === 0 && profile.specialization && (
                            <div className={profileServices.length > 0 ? 'mt-4' : ''}>
                              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Специализация</div>
                              <div className="flex flex-wrap gap-2.5">
                                {profile.specialization.split(',').map((spec, index) => (
                                  <span
                                    key={index}
                                    className="px-3 py-1.5 bg-bg-secondary border border-border-light/60 text-xs font-medium text-graphite-secondary rounded-md"
                                  >
                                    {spec.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {profileSubcategories.length === 0 && profileServices.length === 0 && !profile.specialization && (
                            <p className="text-sm text-text-secondary">Пока не выбрано. Добавьте в настройках профиля.</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                      {profile.services && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-graphite-secondary">
                            <FiBriefcase size={16} />
                            <span>Описание услуг</span>
                          </div>
                          <p className="text-sm text-text-secondary leading-relaxed">{profile.services}</p>
                        </div>
                      )}
                      {profile.service_location && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-graphite-secondary">
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
                          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-graphite-secondary">
                            <FiBriefcase size={16} />
                            <span>Опыт работы</span>
                          </div>
                          <p className="text-sm text-text-secondary">{profile.experience_years} {profile.experience_years === 1 ? 'год' : profile.experience_years < 5 ? 'года' : 'лет'}</p>
                        </div>
                      )}
                      {profile.work_schedule && (
                        <div>
                          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-graphite-secondary">
                            <FiClock size={16} />
                            <span>График работы</span>
                          </div>
                          <p className="text-sm text-text-secondary">{profile.work_schedule}</p>
                        </div>
                      )}
                    </div>

                    {profileServices.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-graphite-secondary">
                          <FiBriefcase size={16} />
                          <span>Услуги мастера</span>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {profileServices.map((svc) => (
                            <span
                              key={svc.id}
                              className="px-3 py-1.5 bg-bg-secondary border border-border-light/60 text-xs font-medium text-graphite-secondary rounded-md"
                            >
                              {svc.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Отзывы о мастере - раскрываемая секция - Render-on-Demand */}
                    {profile.role === 'master' && (
                      <div ref={reviewsSectionRef} className="mt-8 border-t border-border-color/40 pt-6">
                        <button
                          onClick={() => setReviewsExpanded(!reviewsExpanded)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-graphite-secondary">Отзывы</span>
                            {(masterReviews.length > 0 || (profile.master_reviews_count && profile.master_reviews_count > 0)) ? (
                              <div className="flex items-center gap-1.5">
                                {profile.master_rating && profile.master_rating > 0 ? (
                                  <>
                                    <span className="text-sm">⭐</span>
                                    <span className="text-xs text-text-secondary font-medium">
                                      {profile.master_rating.toFixed(1)} · {(masterReviews.length > 0 ? masterReviews.length : profile.master_reviews_count || 0)} {(masterReviews.length === 1 || (profile.master_reviews_count === 1)) ? 'отзыв' : ((masterReviews.length < 5 || (profile.master_reviews_count && profile.master_reviews_count < 5)) ? 'отзыва' : 'отзывов')}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-text-secondary font-medium">
                                    {(masterReviews.length > 0 ? masterReviews.length : profile.master_reviews_count || 0)} {(masterReviews.length === 1 || (profile.master_reviews_count === 1)) ? 'отзыв' : ((masterReviews.length < 5 || (profile.master_reviews_count && profile.master_reviews_count < 5)) ? 'отзыва' : 'отзывов')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-text-secondary">Пока нет отзывов</span>
                            )}
                          </div>
                          {reviewsExpanded ? (
                            <FiChevronUp size={18} className="text-text-secondary" />
                          ) : (
                            <FiChevronDown size={18} className="text-text-secondary" />
                          )}
                        </button>

                        {/* Раскрываемая область с отзывами и полем ввода (стиль чата) */}
                        {reviewsExpanded && (
                          <div className="mt-4 card-glossy p-0 overflow-hidden flex flex-col" style={{ maxHeight: '600px' }}>
                            {/* Список отзывов (прокручиваемая область) */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-h-[450px]">
                              {reviewsLoading ? (
                                <div className="text-center text-text-secondary py-10">
                                  Загрузка отзывов...
                                </div>
                              ) : masterReviews.length === 0 ? (
                                <div className="text-center text-text-secondary py-10">
                                  Пока нет отзывов
                                </div>
                              ) : (
                                masterReviews.map((review) => (
                                  <ReviewCard
                                    key={review.id}
                                    review={review}
                                    reviewType="master"
                                    currentUser={currentUser}
                                    onReply={(reviewId) => setReplyingToReview(replyingToReview === reviewId ? null : reviewId)}
                                    onEdit={(review) => {
                                      setEditingReview(review)
                                      setShowReviewForm(true)
                                    }}
                                    onDelete={async (reviewId) => {
                                      if (confirm('Вы уверены, что хотите удалить отзыв?')) {
                                        try {
                                          const { error } = await supabase
                                            .from('master_reviews')
                                            .delete()
                                            .eq('id', reviewId)
                                          if (error) throw error
                                          
                                          // Если удалили свой отзыв - сбрасываем форму и показываем форму создания
                                          if (currentUser && reviewId === existingUserReview?.id) {
                                            setExistingUserReview(null)
                                            setQuickReviewRating(0)
                                            setQuickReviewText('')
                                          }
                                          
                                          const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                                          if (profileId) {
                                            fetchMasterReviews(profileId)
                                            fetchProfile()
                                          }
                                        } catch (error) {
                                          console.error('Error deleting review:', error)
                                          alert('Ошибка при удалении отзыва')
                                        }
                                      }
                                    }}
                                    showReplies={true}
                                  />
                                ))
                              )}
                              {replyingToReview && currentUser && (
                                <div className="pt-3 border-t border-border-light/40">
                                  <ReviewReplyForm
                                    reviewId={replyingToReview}
                                    reviewType="master"
                                    currentUserId={currentUser.id}
                                    onSuccess={() => {
                                      setReplyingToReview(null)
                                      const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                                      if (profileId) {
                                        fetchMasterReviews(profileId)
                                      }
                                    }}
                                    onCancel={() => setReplyingToReview(null)}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Поле для быстрого создания/редактирования отзыва (внизу, как в чате) - двухэтапный процесс */}
                            {currentUser && profile && currentUser.id !== profile.id && !existingUserReview && (
                              <div className="border-t border-border-color/40 bg-bg-primary px-4 py-3">
                                {/* Этап 1: Выбор рейтинга (показывается сначала) */}
                                {quickReviewRating === 0 && (
                                  <div className="space-y-3">
                                    <label className="block text-sm font-medium text-graphite-secondary text-center">
                                      Ваша оценка *
                                    </label>
                                    <div className="flex justify-center py-2">
                                      <div className="bg-bg-secondary/50 rounded-lg px-4 py-3 border border-border-light/60">
                                        <RatingStars
                                          rating={quickReviewRating}
                                          onRatingChange={(rating) => {
                                            setQuickReviewRating(rating)
                                          }}
                                          size="lg"
                                          readonly={false}
                                        />
                                      </div>
                                    </div>
                                    <p className="text-xs text-text-secondary text-center">
                                      Выберите оценку, чтобы продолжить
                                    </p>
                                  </div>
                                )}

                                {/* Этап 2: Поле для текста отзыва (показывается после выбора рейтинга) */}
                                {quickReviewRating > 0 && (
                                  <form
                                    onSubmit={async (e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      
                                      if (!currentUser || !profile) {
                                        alert('Ошибка: пользователь не авторизован')
                                        return
                                      }

                                      if (quickReviewRating === 0) {
                                        alert('Пожалуйста, выберите рейтинг')
                                        return
                                      }

                                      // Проверяем, есть ли уже отзыв от этого пользователя
                                      const existingReview = masterReviews.find(r => r.reviewer_id === currentUser.id)
                                      
                                      setSendingQuickReview(true)
                                      try {
                                        const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                                        if (!profileId) {
                                          throw new Error('ID профиля не найден')
                                        }

                                        // Если отзыв уже есть, обновляем его, иначе создаем новый
                                        if (existingReview) {
                                          // Обновляем существующий отзыв (рейтинг и комментарий)
                                          const { error } = await supabase
                                            .from('master_reviews')
                                            .update({
                                              rating: quickReviewRating,
                                              comment: quickReviewText.trim() || null,
                                            })
                                            .eq('id', existingReview.id)

                                          if (error) throw error
                                        } else {
                                          // Создаем новый отзыв с выбранным рейтингом
                                          const { error } = await supabase
                                            .from('master_reviews')
                                            .insert({
                                              master_id: profile.id,
                                              reviewer_id: currentUser.id,
                                              rating: quickReviewRating,
                                              comment: quickReviewText.trim() || null,
                                            })

                                          if (error) {
                                            if (error.code === '23505') {
                                              alert('Вы уже оставили отзыв. Можно отредактировать существующий.')
                                              return
                                            }
                                            throw error
                                          }
                                        }

                                        // Обновляем данные
                                        if (profileId) {
                                          await fetchMasterReviews(profileId)
                                          await fetchProfile()
                                        }
                                        
                                        // Если это был новый отзыв - сбрасываем форму, иначе оставляем для редактирования
                                        if (!existingReview) {
                                          setQuickReviewRating(0)
                                          setQuickReviewText('')
                                        }
                                        
                                        // Прокручиваем к началу списка отзывов
                                        setTimeout(() => {
                                          const reviewsContainer = document.querySelector('.overflow-y-auto')
                                          if (reviewsContainer) {
                                            reviewsContainer.scrollTop = 0
                                          }
                                        }, 100)
                                      } catch (error: any) {
                                        console.error('Error creating review:', error)
                                        alert(`Ошибка при отправке отзыва: ${error.message || 'Неизвестная ошибка'}`)
                                      } finally {
                                        setSendingQuickReview(false)
                                      }
                                    }}
                                    className="space-y-3"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {/* Показываем выбранный рейтинг с возможностью изменить */}
                                    <div className="flex items-center justify-between">
                                      <label className="block text-sm font-medium text-graphite-secondary">
                                        Ваша оценка: {quickReviewRating} {quickReviewRating === 1 ? 'звезда' : quickReviewRating < 5 ? 'звезды' : 'звезд'}
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => setQuickReviewRating(0)}
                                        className="text-xs text-text-secondary hover:text-brand-accent transition-colors"
                                      >
                                        Изменить
                                      </button>
                                    </div>
                                    <div className="flex justify-center">
                                      <RatingStars
                                        rating={quickReviewRating}
                                        onRatingChange={(rating) => {
                                          setQuickReviewRating(rating)
                                        }}
                                        size="md"
                                        readonly={false}
                                      />
                                    </div>

                                    {/* Поле ввода текста */}
                                    <div className="flex gap-2">
                                      <div className="flex-1 relative">
                                        <textarea
                                          value={quickReviewText}
                                          onChange={(e) => setQuickReviewText(e.target.value)}
                                          placeholder="Написать отзыв (необязательно)..."
                                          rows={2}
                                          className="input resize-none pr-16 w-full text-sm"
                                          maxLength={1000}
                                        />
                                        <div className="absolute bottom-2 right-12 text-xs text-text-secondary pointer-events-none">
                                          {quickReviewText.length}/1000
                                        </div>
                                      </div>
                                      <button
                                        type="submit"
                                        disabled={sendingQuickReview}
                                        className="h-auto px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 self-end"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                        }}
                                      >
                                        {sendingQuickReview ? (
                                          <span className="text-xs">Отправка...</span>
                                        ) : (
                                          <FiSend size={18} />
                                        )}
                                      </button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}

                {/* Seller-specific information */}
                {profile.role === 'seller' && (
                  <div className="mt-10 pt-8 px-4 sm:px-5 border-t border-border-color/40">
                    {profile.store_address && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-graphite-secondary">
                          <FiMapPin size={16} className="text-brand-accent" />
                          <span>Адрес магазина</span>
                        </div>
                        {profile.seller_lat != null && profile.seller_lng != null ? (
                          <button
                            type="button"
                            onClick={() => setShowStoreLocationMap(true)}
                            className="text-sm text-text-secondary text-left underline decoration-brand-accent/60 underline-offset-2 hover:decoration-brand-accent hover:text-brand-accent transition-colors"
                          >
                            {profile.store_address}
                          </button>
                        ) : (
                          <p className="text-sm text-text-secondary">{profile.store_address}</p>
                        )}
                      </div>
                    )}
                    <div className="mb-6">
                      <button
                        type="button"
                        onClick={() => setShowCatalogModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-bg-secondary border border-border-light/60 rounded-lg text-sm font-medium text-graphite-secondary hover:bg-border-light/30 hover:border-border-light transition-colors"
                      >
                        <FiBriefcase size={16} className="text-brand-accent" />
                        <span>Каталог</span>
                        {profile.product_categories && (
                          <span className="text-xs text-text-secondary">
                            ({profile.product_categories.split(',').filter(Boolean).length})
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Модальное окно: категории и каталог товаров */}
                {showCatalogModal && profile.role === 'seller' && (
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCatalogModal(false)}>
                    <div className="bg-bg-card rounded-xl shadow-xl max-w-md w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light/70">
                        <h3 className="text-lg font-semibold text-graphite-secondary flex items-center gap-2">
                          <FiBriefcase size={20} className="text-brand-accent" />
                          Категории и каталог
                        </h3>
                        <button
                          type="button"
                          onClick={() => setShowCatalogModal(false)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Закрыть"
                        >
                          <FiX className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="p-4 overflow-y-auto flex-1">
                        {profile.product_categories ? (
                          <div className="flex flex-wrap gap-2.5">
                            {profile.product_categories.split(',').map((category, index) => (
                              <span
                                key={index}
                                className="px-3 py-1.5 bg-bg-secondary border border-border-light/60 text-xs font-medium text-graphite-secondary rounded-md"
                              >
                                {category.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-text-secondary">Нет выбранных категорий</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PROFILE_RELATED реклама для мастеров */}
              {profile.role === 'master' && (
                <div className="mb-10 sm:mb-12 w-full">
                  <AdSlot 
                    type="PROFILE_RELATED" 
                    context={{ 
                      masterId: profile.id,
                      specialization: profile.specialization || profileSubcategories[0]?.name || undefined
                    }}
                    className="mb-6"
                  />
                </div>
              )}

              {/* Products for Sellers */}
              {profile.role === 'seller' && (
                <div className="mb-10 sm:mb-12 w-full">
                  {/* Статистика продавца */}
                  <div className="card mb-6">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-graphite-secondary">
                          {profile.seller_reviews_count || 0}
                        </div>
                        <div className="text-sm text-text-secondary">Отзывов</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-graphite-secondary">{productsCount}</div>
                        <div className="text-sm text-text-secondary">Товаров</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-graphite-secondary">{followersCount}</div>
                        <div className="text-sm text-text-secondary">Подписчиков</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-graphite-secondary tracking-tight">Товары</h2>
                    <div className="flex gap-2">
                      {isOwnProfile && profile.role === 'seller' && profile.seller_lat != null && profile.seller_lng != null && (
                        <button
                          type="button"
                          onClick={() => setShowStoresMap(true)}
                          className="btn btn-secondary text-sm w-full sm:w-auto flex items-center gap-2"
                        >
                          <FiMapPin size={16} />
                          Показать на карте
                        </button>
                      )}
                      {isOwnProfile && (
                        <Link
                          href="/products/new"
                          className="btn btn-primary text-sm w-full sm:w-auto"
                        >
                          Добавить товар
                        </Link>
                      )}
                    </div>
                  </div>
                  {products.length === 0 ? (
                    <div className="card text-center text-text-secondary py-10">
                      Пока нет товаров
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {products.map((product) => {
                        const thumb = product.images && product.images.length > 0 ? product.images[0] : ''
                        const imagesCount = product.images ? product.images.length : 0
                        const timeAgo = product.created_at ? format(new Date(product.created_at), 'd MMMM в HH:mm', { locale: ru }) : ''
                        const isToday = product.created_at ? new Date(product.created_at).toDateString() === new Date().toDateString() : false
                        const isYesterday = product.created_at ? new Date(product.created_at).toDateString() === new Date(Date.now() - 86400000).toDateString() : false
                        let timeDisplay = timeAgo
                        if (isToday) {
                          timeDisplay = `сегодня в ${format(new Date(product.created_at!), 'HH:mm', { locale: ru })}`
                        } else if (isYesterday) {
                          timeDisplay = `вчера в ${format(new Date(product.created_at!), 'HH:mm', { locale: ru })}`
                        }
                        
                        return (
                          <Link
                            key={product.id}
                            href={`/products/${product.id}`}
                            className="card-glossy overflow-hidden group cursor-pointer flex flex-col !p-0 relative"
                          >
                            {/* Глянцевый эффект */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"></div>
                            
                            {/* Изображение товара */}
                            <div className="w-full h-[180px] bg-bg-secondary relative overflow-hidden rounded-t-[12px] flex-shrink-0 group/image">
                              {thumb ? (
                                <>
                                  <img
                                    src={thumb}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-secondary text-4xl bg-bg-secondary">
                                  <FiShoppingBag size={48} strokeWidth={1.5} />
                                </div>
                              )}
                              {/* Иконка сердца (избранное) */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors z-20"
                              >
                                <FiHeart size={16} className="text-text-secondary" />
                              </button>
                              {/* Количество фото */}
                              {imagesCount > 0 && (
                                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-1 text-xs font-medium rounded-lg flex items-center gap-1 z-20">
                                  <FiCamera size={12} />
                                  <span>{imagesCount}</span>
                            </div>
                              )}
                              </div>

                            {/* Информация о товаре */}
                            <div className="flex flex-col flex-1 p-4 relative z-20">
                              <div className="text-lg font-semibold text-brand-accent mb-2">
                                {product.price.toLocaleString('ru-RU')} ₽
                              </div>
                              <h3 className="font-medium text-sm text-graphite-secondary mb-2 line-clamp-2 leading-tight group-hover:text-brand-accent transition-colors">
                                {product.name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-auto pt-2 border-t border-border-light/40">
                                <FiMapPin size={12} />
                                <span>{profile.store_address || profile.city || 'Адрес не указан'}</span>
                              </div>
                              <div className="text-xs text-text-secondary mt-1">
                                {timeDisplay}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                  {productsHasMore && <div ref={productsLoadMoreSentinelRef} className="h-4" aria-hidden />}

                  {/* Отзывы о продавце - Render-on-Demand */}
                  <div ref={reviewsSectionRef} className="mt-10 sm:mt-12 px-4 sm:px-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
                      <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-graphite-secondary tracking-tight mb-1">
                          Отзывы
                        </h2>
                        {profile.seller_rating && profile.seller_reviews_count ? (
                          <div className="flex items-center gap-2">
                            <RatingStars rating={profile.seller_rating} size="sm" readonly showValue />
                            <span className="text-sm text-text-secondary">
                              ({profile.seller_reviews_count} {profile.seller_reviews_count === 1 ? 'отзыв' : profile.seller_reviews_count < 5 ? 'отзыва' : 'отзывов'})
                            </span>
                </div>
                        ) : (
                          <p className="text-sm text-text-secondary">Пока нет отзывов</p>
                        )}
                      </div>
                      {currentUser && !isOwnProfile && (
                        <button
                          onClick={() => {
                            setShowReviewForm(true)
                            setEditingReview(null)
                          }}
                          className="btn btn-primary text-sm w-full sm:w-auto"
                        >
                          Оставить отзыв
                        </button>
                      )}
                    </div>

                    {/* Форма отзыва о продавце */}
                    {showReviewForm && currentUser && !isOwnProfile && (
                      <div className="mb-6">
                        <ReviewForm
                          targetId={Array.isArray(params.id) ? params.id[0] : params.id}
                          targetType="seller"
                          currentUserId={currentUser.id}
                          existingReview={editingReview}
                          onSuccess={() => {
                            setShowReviewForm(false)
                            setEditingReview(null)
                            const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                            if (profileId) {
                              fetchSellerReviews(profileId)
                              fetchProfile()
                            }
                          }}
                          onCancel={() => {
                            setShowReviewForm(false)
                            setEditingReview(null)
                          }}
                        />
                      </div>
                    )}

                    {/* Список прямых отзывов о продавце */}
                    {sellerReviews.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-md font-semibold text-graphite-secondary mb-4">Прямые отзывы о продавце</h3>
                        <div className="space-y-4">
                          {sellerReviews.map((review) => (
                            <ReviewCard
                              key={review.id}
                              review={review}
                              reviewType="seller"
                              currentUser={currentUser}
                              onReply={(reviewId) => setReplyingToReview(replyingToReview === reviewId ? null : reviewId)}
                              onEdit={(review) => {
                                setEditingReview(review)
                                setShowReviewForm(true)
                              }}
                              onDelete={async (reviewId) => {
                                if (confirm('Вы уверены, что хотите удалить отзыв?')) {
                                  try {
                                    const { error } = await supabase
                                      .from('seller_reviews')
                                      .delete()
                                      .eq('id', reviewId)
                                    if (error) throw error
                                    const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                                    if (profileId) {
                                      fetchSellerReviews(profileId)
                                      fetchProfile()
                                    }
                                  } catch (error) {
                                    console.error('Error deleting review:', error)
                                    alert('Ошибка при удалении отзыва')
                                  }
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Отзывы о товарах продавца */}
                    {productReviews.length > 0 && (
                      <div>
                        <h3 className="text-md font-semibold text-graphite-secondary mb-4">Отзывы о товарах</h3>
                        <div className="space-y-4">
                          {productReviews.map((review) => (
                            <ReviewCard
                              key={review.id}
                              review={review}
                              reviewType="product"
                              currentUser={currentUser}
                              onReply={(reviewId) => setReplyingToReview(replyingToReview === reviewId ? null : reviewId)}
                              onEdit={(review) => {
                                setEditingReview(review)
                                setShowReviewForm(true)
                              }}
                              onDelete={async (reviewId) => {
                                if (confirm('Вы уверены, что хотите удалить отзыв?')) {
                                  try {
                                    const { error } = await supabase
                                      .from('product_reviews')
                                      .delete()
                                      .eq('id', reviewId)
                                    if (error) throw error
                                    const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                                    if (profileId) {
                                      fetchProductReviews(profileId)
                                      fetchSellerStats(profileId)
                                    }
                                  } catch (error) {
                                    console.error('Error deleting review:', error)
                                    alert('Ошибка при удалении отзыва')
                                  }
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Сообщение, если нет отзывов */}
                    {!reviewsLoading && sellerReviews.length === 0 && productReviews.length === 0 && (
                      <div className="card text-center text-text-secondary py-10">
                        Пока нет отзывов
                      </div>
                    )}

                    {/* Форма ответа на отзыв */}
                    {replyingToReview && (
                      <ReviewReplyForm
                        reviewId={replyingToReview}
                        reviewType="seller"
                        currentUserId={currentUser!.id}
                        onSuccess={() => {
                          setReplyingToReview(null)
                          const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                          if (profileId) {
                            fetchSellerReviews(profileId)
                            fetchProductReviews(profileId)
                          }
                        }}
                        onCancel={() => setReplyingToReview(null)}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Portfolio for Masters - Render-on-Demand */}
              {profile.role === 'master' && (
                <div ref={portfolioSectionRef} className="mb-10 sm:mb-12 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-graphite-secondary tracking-tight">Портфолио</h2>
                    <div className="flex items-center gap-2">
                      {isOwnProfile && (
                        <Link
                          href="/portfolio/new"
                          className="btn btn-primary text-sm w-full sm:w-auto flex items-center justify-center gap-1.5"
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
                  {portfolioHasMore && <div ref={portfolioLoadMoreSentinelRef} className="h-4" aria-hidden />}
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
              initialCommentId={searchParams.get('comment') || undefined}
              focusCommentInput={searchParams.get('focusComment') === '1'}
            />
          )}

          {/* Settings Tab Content */}
          {activeTab === 'settings' && isOwnProfile && (
            <div className="card w-full">
              <h1 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-graphite-secondary tracking-tight">Настройки</h1>

              {/* Settings Sub-tabs - Vertical List */}
              <div className="flex flex-col gap-1 sm:gap-2 mb-4 sm:mb-6 w-full">
                <button
                  onClick={() => setSettingsTab('edit')}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-sm transition-colors rounded-md text-left ${
                    settingsTab === 'edit'
                      ? 'bg-brand-accent text-white'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FiUser size={16} className="flex-shrink-0" />
                    <span className="truncate">Редактировать профиль</span>
                  </div>
                </button>
                {profile.role === 'master' && (
                  <button
                    onClick={() => setSettingsTab('specializations')}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-sm transition-colors rounded-md text-left ${
                      settingsTab === 'specializations'
                        ? 'bg-brand-accent text-white'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FiBriefcase size={16} className="flex-shrink-0" />
                      <span className="truncate">Специализации и услуги</span>
                    </div>
                  </button>
                )}
                <button
                  onClick={() => setSettingsTab('security')}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-sm transition-colors rounded-md text-left ${
                    settingsTab === 'security'
                      ? 'bg-brand-accent text-white'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FiShield size={16} className="flex-shrink-0" />
                    <span className="truncate">Безопасность</span>
                  </div>
                </button>
                <button
                  onClick={() => setSettingsTab('account')}
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-sm transition-colors rounded-md text-left ${
                    settingsTab === 'account'
                      ? 'bg-brand-accent text-white'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FiLock size={16} className="flex-shrink-0" />
                    <span className="truncate">Аккаунт</span>
                  </div>
                </button>
              </div>

              {/* Edit Profile Tab */}
              {settingsTab === 'edit' && (
                <div className="space-y-4 sm:space-y-6 w-full">
              {/* Image Upload Section */}
              <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-border-color">
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-graphite-secondary tracking-tight">Изображения профиля</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Avatar Upload */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-graphite-secondary">
                      Аватарка
                  </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-text-primary border-2 border-border-color flex items-center justify-center text-white text-lg sm:text-xl font-semibold rounded-full flex-shrink-0">
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
                      <div className="flex-1 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setShowAvatarModal(true)}
                          disabled={uploadingAvatar}
                          className="btn btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2"
                        >
                          <FiCamera size={16} />
                          <span>{uploadingAvatar ? 'Загрузка...' : 'Изменить'}</span>
                        </button>
                </div>
                    </div>
                </div>

                  {/* Cover Photo Upload */}
                      <div>
                    <label className="block text-sm font-medium mb-2 text-graphite-secondary">
                      Фоновая картинка
                        </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <div className="w-full sm:w-20 h-12 bg-bg-secondary border border-border-color rounded overflow-hidden flex-shrink-0">
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
                      <div className="flex-1 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setShowCoverModal(true)}
                          disabled={uploadingCover}
                          className="btn btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2"
                        >
                          <FiCamera size={16} />
                          <span>{uploadingCover ? 'Загрузка...' : 'Изменить'}</span>
                        </button>
                      </div>
                        </div>
                      </div>
                        </div>
                      </div>

              {/* Edit Profile Form */}
              <form onSubmit={handleSaveSettings} className="space-y-4 w-full">
                <div className="w-full">
                  <label className="block text-sm font-medium mb-2">
                    ФИО *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="input w-full"
                  />
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input w-full"
                  />
                </div>

                {/* Город только для не-продавцов: у продавца адрес магазина задаётся в блоке «Адрес магазина» ниже */}
                {profile.role !== 'seller' && (
                  <div className="w-full">
                    <label className="block text-sm font-medium mb-2">
                      Город
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                )}

                <div className="w-full">
                  <label className="block text-sm font-medium mb-2">
                    О себе
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea w-full"
                    rows={5}
                  />
                </div>

                {/* Master-specific fields (only basic info, specializations moved to separate tab) */}
                {profile.role === 'master' && (
                  <>
                    <div className="border-t border-gray-200 pt-4 sm:pt-6 mt-4 sm:mt-6 w-full">
                      <h3 className="text-sm sm:text-base font-bold mb-3 sm:mb-4">Информация для мастера</h3>
                      
                      <div className="w-full">
                        <label className="block text-sm font-medium mb-2">
                          Описание услуг (необязательно)
                        </label>
                        <textarea
                          value={servicesText}
                          onChange={(e) => setServicesText(e.target.value)}
                          placeholder="Кратко опишите ваши услуги или особенности работы"
                          className="textarea w-full"
                          rows={4}
                        />
                      </div>

                      <div className="mt-4 w-full">
                        <label className="block text-sm font-medium mb-2">
                          Место обслуживания *
                        </label>
                        <select
                          value={serviceLocation}
                          onChange={(e) => setServiceLocation(e.target.value as 'home' | 'workshop' | 'both')}
                          className="input w-full"
                          required
                        >
                          <option value="home">Выезд на дом</option>
                          <option value="workshop">В мастерской</option>
                          <option value="both">Выезд и в мастерской</option>
                        </select>
                      </div>

                      <div className="mt-4 w-full">
                        <label className="block text-sm font-medium mb-2">
                          Опыт работы (лет)
                        </label>
                        <input
                          type="number"
                          value={experienceYears}
                          onChange={(e) => setExperienceYears(e.target.value ? Number(e.target.value) : '')}
                          min="0"
                          max="100"
                          className="input w-full"
                          placeholder="Например: 5"
                        />
                      </div>

                      <div className="mt-4 w-full">
                        <MasterRadiusPicker />
                      </div>

                      <div className="mt-4 w-full">
                        <label className="block text-sm font-medium mb-2">
                          График работы
                        </label>
                        <input
                          type="text"
                          value={workSchedule}
                          onChange={(e) => setWorkSchedule(e.target.value)}
                          placeholder="Например: Пн-Пт 9:00-18:00, Сб 10:00-16:00"
                          className="input w-full"
                        />
                      </div>

                    </div>
                  </>
                )}

                {/* Seller-specific fields: точный адрес магазина вместо города — для карты и «Товары рядом» */}
                {profile.role === 'seller' && (
                  <>
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <h3 className="text-base font-bold mb-4">Информация для продавца</h3>
                      <p className="text-sm text-text-secondary mb-4">
                        Укажите точный адрес магазина или склада. По нему вас найдут на карте, а мастерам в радиусе будут показываться ваши товары в блоке «Товары рядом».
                      </p>
                      <SellerAddressPicker
                        onSave={() => {
                          fetchProfile()
                        }}
                      />

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

                <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-gray-200 mt-4 sm:mt-6 w-full">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium bg-black text-white border border-black hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      setSelectedSubcategoryIds(profileSubcategories.map((s) => s.id))
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
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium bg-bg-card text-graphite-secondary border border-border-light hover:bg-bg-secondary transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

              {/* Specializations and Services Tab (only for masters) */}
              {settingsTab === 'specializations' && profile.role === 'master' && (
                <div className="space-y-4 sm:space-y-6 w-full">
                  <div className="w-full">
                    <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-graphite-secondary tracking-tight">Категории и подкатегории</h2>
                    <div className="space-y-4 max-h-96 overflow-y-auto border border-border-color p-3 sm:p-4 rounded-md">
                      {tree.map((cat) => (
                        <div key={cat.id}>
                          <div className="font-medium text-graphite-secondary mb-2">{cat.name}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                            {cat.subcategories.map((sub) => (
                              <label key={sub.id} className="flex items-center gap-2 text-sm text-text-primary">
                                <input
                                  type="checkbox"
                                  checked={selectedSubcategoryIds.includes(sub.id)}
                                  onChange={() => toggleSubcategory(sub.id)}
                                  className="w-4 h-4"
                                />
                                <span>{sub.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full">
                    <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-graphite-secondary tracking-tight">Услуги</h2>
                    <p className="text-sm text-text-secondary mb-3 sm:mb-4">
                      Услуги по выбранным подкатегориям
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-border-color p-3 sm:p-4 rounded-md">
                      {filteredServices.length === 0 ? (
                        <p className="text-sm text-text-secondary col-span-2">Сначала выберите подкатегории</p>
                      ) : (
                        filteredServices.map((svc: any) => (
                          <label key={svc.id} className="flex items-center gap-2 text-sm text-text-primary">
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

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border-color w-full">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!currentUser) return
                        await syncSelections(currentUser.id)
                        await fetchSelections()
                        alert('Категории и услуги сохранены!')
                      }}
                      className="btn btn-primary w-full sm:w-auto"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubcategoryIds(profileSubcategories.map((s) => s.id))
                        setSelectedServiceIds(profileServices.map((s) => s.id))
                      }}
                      className="btn btn-secondary w-full sm:w-auto"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {settingsTab === 'security' && (
                <div className="w-full">
                  <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-graphite-secondary tracking-tight">Изменение пароля</h2>
                  <p className="text-sm text-text-secondary mb-3 sm:mb-4">
                    Пароль хранится в зашифрованном виде и не может быть просмотрен. Вы можете изменить его, указав текущий пароль.
                  </p>

                  <form onSubmit={handleChangePassword} className="space-y-4 w-full">
                    <div className="w-full">
                      <label className="block text-sm font-medium mb-2 text-graphite-secondary">
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
                    
                    <div className="w-full">
                      <label className="block text-sm font-medium mb-2 text-graphite-secondary">
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

                    <div className="w-full">
                      <label className="block text-sm font-medium mb-2 text-graphite-secondary">
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
                      className="btn btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
                    >
                      <FiLock size={16} />
                      <span>{changingPassword ? 'Изменение...' : 'Изменить пароль'}</span>
                    </button>
                  </form>
                      </div>
                    )}

              {/* Account Tab */}
              {settingsTab === 'account' && (
                <div className="space-y-4 sm:space-y-6 w-full">
                  {/* Sign Out Section */}
                  <div className="pb-4 sm:pb-6 border-b border-border-color w-full">
                    <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-graphite-secondary tracking-tight">Выход из аккаунта</h2>
                    <p className="text-sm text-text-secondary mb-3 sm:mb-4">
                      Вы можете выйти из аккаунта в любой момент. Для повторного входа потребуется ввести email и пароль.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
                          await supabase.auth.signOut()
                          router.push('/')
                        }
                      }}
                      className="btn btn-secondary w-full sm:w-auto flex items-center justify-center gap-2"
                    >
                      <FiLogOut size={16} />
                      <span>Выйти из аккаунта</span>
                    </button>
                        </div>

                  {/* Delete Account Section */}
                  <div className="w-full">
                    <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-red-600">Удаление аккаунта</h2>
                    <p className="text-sm text-text-secondary mb-3 sm:mb-4">
                      Удаление аккаунта необратимо. Все ваши данные будут безвозвратно удалены.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteEmail(currentUser?.email || '')
                        setShowDeleteAccountModal(true)
                      }}
                      className="btn bg-red-500 hover:bg-red-600 text-white border-red-500 w-full sm:w-auto"
                    >
                      Удалить аккаунт
                    </button>
                        </div>
                      </div>
                    )}
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
            <h3 className="text-lg font-semibold mb-4 text-graphite-secondary tracking-tight">Аватарка</h3>
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
                className="btn bg-bg-secondary hover:bg-bg-primary text-graphite-secondary border border-border-light"
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
            <h3 className="text-lg font-semibold mb-4 text-graphite-secondary tracking-tight">Фоновая картинка</h3>
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
                className="btn bg-bg-secondary hover:bg-bg-primary text-graphite-secondary border border-border-light"
                            >
                Отмена
              </button>
                    </div>
                  </div>
                </div>
                )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 animate-fade-in"
          onClick={() => setShowDeleteAccountModal(false)}
                          >
          <div
            className="bg-bg-primary border border-red-200 rounded-lg shadow-card p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-red-600">Удаление аккаунта</h3>
            <p className="text-sm text-text-secondary mb-4">
              Для подтверждения удаления аккаунта введите ваш email и пароль. Это действие необратимо.
            </p>
            
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!currentUser) return

                if (!deleteEmail || !deletePassword) {
                  setDeleteError('Заполните все поля')
                  return
                }

                setDeletingAccount(true)
                setDeleteError('')

                try {
                  const token = (await supabase.auth.getSession()).data.session?.access_token
                  if (!token) {
                    throw new Error('Не удалось получить токен авторизации')
                  }

                  const response = await fetch('/api/account/delete', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      email: deleteEmail || currentUser.email,
                      password: deletePassword,
                    }),
                  })

                  const data = await response.json()

                  if (!response.ok) {
                    throw new Error(data.error || 'Ошибка при удалении аккаунта')
                  }

                  // Выходим из аккаунта и редиректим на главную
                  await supabase.auth.signOut()
                  router.push('/')
                } catch (error: any) {
                  console.error('Error deleting account:', error)
                  setDeleteError(error.message || 'Ошибка при удалении аккаунта')
                } finally {
                  setDeletingAccount(false)
                }
              }}
              className="space-y-4"
            >
                      <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">
                  Email *
                        </label>
                              <input
                  type="email"
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  className="input w-full"
                  placeholder={currentUser?.email || "Введите ваш email"}
                  disabled={deletingAccount}
                  required
                />
                      </div>
                      
                      <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">
                  Пароль *
                        </label>
                        <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="input w-full"
                  placeholder="Введите ваш пароль"
                  disabled={deletingAccount}
                  required
                        />
                      </div>

              {deleteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {deleteError}
                        </div>
                      )}

              <div className="flex gap-3">
                  <button
                    type="submit"
                  disabled={deletingAccount || !deleteEmail || !deletePassword}
                  className="btn bg-red-500 hover:bg-red-600 text-white border-red-500 flex-1"
                  >
                  {deletingAccount ? 'Удаление...' : 'Подтвердить удаление'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                    setShowDeleteAccountModal(false)
                    setDeleteEmail(currentUser?.email || '')
                    setDeletePassword('')
                    setDeleteError('')
                  }}
                  disabled={deletingAccount}
                  className="btn bg-bg-secondary hover:bg-bg-primary text-graphite-secondary border border-border-light"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Одна метка: адрес магазина на карте (клик по адресу) */}
      {showStoreLocationMap && profile?.role === 'seller' && profile.seller_lat != null && profile.seller_lng != null && (
        <StoreLocationMapModal
          isOpen={true}
          onClose={() => setShowStoreLocationMap(false)}
          lat={profile.seller_lat}
          lng={profile.seller_lng}
          address={profile.store_address || profile.city || 'Адрес магазина'}
          title="Адрес магазина"
        />
      )}

      {/* Stores Map Modal */}
      {showStoresMap && profile && currentUser && (
        <div className="fixed inset-0 z-[9999] bg-bg-primary flex flex-col">
          <div className="h-14 px-4 flex items-center justify-between border-b border-border-light/70 bg-bg-card">
            <h2 className="text-lg font-semibold">Карта магазинов</h2>
            <button
              onClick={() => setShowStoresMap(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Закрыть"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <StoresMap
              masterLocation={
                (() => {
                  if (!currentUser || currentUser.role !== 'master') return null
                  // После проверки currentUser гарантированно не null
                  const lat = currentUser!.master_lat
                  const lng = currentUser!.master_lng
                  const radius = currentUser!.service_radius_km
                  if (
                    typeof lat === 'number' && 
                    typeof lng === 'number' &&
                    typeof radius === 'number'
                  ) {
                    return {
                      lat,
                      lng,
                      radiusKm: radius,
                    }
                  }
                  return null
                })()
              }
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}


