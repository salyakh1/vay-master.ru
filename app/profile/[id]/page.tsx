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
import { FiMapPin, FiPhone, FiMail, FiPlus, FiBriefcase, FiClock, FiHome, FiMessageCircle, FiCamera, FiX, FiLock, FiArrowLeft, FiLogOut, FiUser, FiShield, FiHeart, FiShoppingBag, FiChevronDown, FiChevronUp, FiSend, FiTarget } from 'react-icons/fi'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import AuthRequiredModal from '@/components/AuthRequiredModal'
import { profileLoginUrl } from '@/lib/guest-access'
import AdSlot from '@/components/AdSlot'
import ReviewCard from '@/components/ReviewCard'
import ReviewForm from '@/components/ReviewForm'
import ReviewReplyForm from '@/components/ReviewReplyForm'
import RatingStars from '@/components/RatingStars'
import StoriesCircle from '@/components/StoriesCircle'
import ProfileStrictHeader from '@/components/profile/ProfileStrictHeader'
import ProfileServicesRow from '@/components/profile/ProfileServicesRow'
import ProfileServicesSheet from '@/components/profile/ProfileServicesSheet'
import ProfileReviewsPreview from '@/components/profile/ProfileReviewsPreview'
import SellerProductsSection from '@/components/profile/SellerProductsSection'

const StoreLocationMapModal = dynamic(() => import('@/components/StoreLocationMapModal'), { ssr: false })
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
  const [adminRole, setAdminRole] = useState<string | null>(null)
  const [profileSubcategories, setProfileSubcategories] = useState<Array<{ id: string; name: string; slug: string; category?: { id: string; name: string; slug: string } }>>([])
  const [profileServices, setProfileServices] = useState<Service[]>([])
  const [isFollowing, setIsFollowing] = useState<boolean>(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followersCount, setFollowersCount] = useState<number>(0)
  const [followingCount, setFollowingCount] = useState<number>(0)
  const [productsCount, setProductsCount] = useState<number>(0)
  const [masterOrdersCount, setMasterOrdersCount] = useState<number>(0)
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null)
  const [followList, setFollowList] = useState<User[]>([])
  const [followListLoading, setFollowListLoading] = useState(false)
  const [followActionId, setFollowActionId] = useState<string | null>(null)
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

  const profileId = Array.isArray(params.id) ? params.id[0] : params.id
  const [showStoresMap, setShowStoresMap] = useState(false)
  const [showStoreLocationMap, setShowStoreLocationMap] = useState(false)
  const [showServicesSheet, setShowServicesSheet] = useState(false)

  // Гости не могут открывать профили — редирект на вход с returnTo
  useEffect(() => {
    if (authLoading || currentUser || !profileId) return
    router.replace(profileLoginUrl(profileId))
  }, [authLoading, currentUser, profileId, router])

  useEffect(() => {
    if (!params.id || !currentUser) return
    setPortfolioFetched(false)
    setReviewsFetched(false)
    setPortfolioItems([])
    setMasterReviews([])
    setProductReviews([])
    fetchProfile()
    checkFollowing()
  }, [params.id, currentUser])

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

  useEffect(() => {
    if (showFollowModal && profile?.id) fetchFollowList(showFollowModal)
  }, [showFollowModal, profile?.id])

  const fetchSelections = async (profileId: string) => {
    try {
      const [{ data: subRows }, { data: svcRows }] = await Promise.all([
        supabase
          .from('profile_subcategories')
          .select('subcategory:subcategories(id, name, slug, category:categories(id, name, slug))')
          .eq('profile_id', profileId),
        supabase
          .from('profile_services')
          .select('service:services(id, name, slug, subcategory_id)')
          .eq('profile_id', profileId),
      ])
      const subs = (subRows || [])
        .map((row: any) => row.subcategory)
        .filter(Boolean) as Array<{ id: string; name: string; slug: string; category?: { id: string; name: string; slug: string } }>
      const svcs = (svcRows || [])
        .map((row: any) => row.service)
        .filter(Boolean) as Service[]
      setProfileSubcategories(subs)
      setProfileServices(svcs)
    } catch (error) {
      console.error('Error fetching profile selections:', error)
      setProfileSubcategories([])
      setProfileServices([])
    }
  }

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
      if (profileId) {
        await fetchSelections(profileId)
      }
      
      // Истории профиля (для всех ролей) — нужны для шапки
      if (profileId) {
        await fetchProfileStories(profileId)
      }

      // Первый экран готов: показываем контент
      setLoading(false)

      // Портфолио, отзывы, товары — после первого рендера (idle), не блокируем LCP
      const scheduleHeavy = () => {
        if (profileId) fetchFollowCounts(profileId)
        if (userData.role === 'master' && profileId) {
          fetchMasterOrdersCount(profileId)
          fetchPortfolio().then(() => fetchMasterReviews(profileId))
        } else if (userData.role === 'seller' && profileId) {
          fetchSellerProducts()
          fetchSellerStats(profileId)
          fetchProductReviews(profileId)
          fetchSellerReviews(profileId)
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

  const fetchMasterOrdersCount = async (profileId: string) => {
    try {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('selected_master_id', profileId)
        .in('status', ['in_progress', 'completed'])
      setMasterOrdersCount(count ?? 0)
    } catch (error) {
      console.error('Error fetching master orders count:', error)
    }
  }

  const fetchFollowCounts = async (profileId: string) => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
      ])
      setFollowersCount(followersRes.count ?? 0)
      setFollowingCount(followingRes.count ?? 0)
    } catch (error) {
      console.error('Error fetching follow counts:', error)
      setFollowersCount(0)
      setFollowingCount(0)
    }
  }

  const fetchFollowList = async (type: 'followers' | 'following') => {
    if (!profile?.id) return
    setFollowListLoading(true)
    setFollowList([])
    try {
      if (type === 'followers') {
        const { data: rows, error } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', profile.id)
        if (error) throw error
        const ids = (rows || []).map((r: { follower_id: string }) => r.follower_id).filter(Boolean)
        if (ids.length === 0) {
          setFollowList([])
          setFollowListLoading(false)
          return
        }
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, city')
          .in('id', ids)
        if (usersError) throw usersError
        setFollowList((users as User[]) || [])
      } else {
        const { data: rows, error } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', profile.id)
        if (error) throw error
        const ids = (rows || []).map((r: { following_id: string }) => r.following_id).filter(Boolean)
        if (ids.length === 0) {
          setFollowList([])
          setFollowListLoading(false)
          return
        }
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, city')
          .in('id', ids)
        if (usersError) throw usersError
        setFollowList((users as User[]) || [])
      }
    } catch (error) {
      console.error('Error fetching follow list:', error)
      setFollowList([])
    } finally {
      setFollowListLoading(false)
    }
  }

  const unfollowUser = async (followingId: string) => {
    if (!profile?.id || !currentUser || currentUser.id !== profile.id) return
    setFollowActionId(followingId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      const res = await fetch('/api/follows/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: followingId, action: 'unfollow' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Не удалось отписаться')
      setFollowList((prev) => prev.filter((u) => u.id !== followingId))
      await fetchFollowCounts(profile.id)
    } catch (error) {
      console.error('Error unfollowing:', error)
    } finally {
      setFollowActionId(null)
    }
  }

  const removeFollower = async (followerId: string) => {
    if (!profile?.id || !currentUser || currentUser.id !== profile.id) return
    setFollowActionId(followerId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      const res = await fetch('/api/follows/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId: followerId, action: 'remove_follower' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Не удалось убрать подписчика')
      setFollowList((prev) => prev.filter((u) => u.id !== followerId))
      await fetchFollowCounts(profile.id)
    } catch (error) {
      console.error('Error removing follower:', error)
    } finally {
      setFollowActionId(null)
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
      // Обновляем счётчики подписчиков/подписок после изменения подписки
      await fetchFollowCounts(profile.id)
      if (profile.role === 'seller') await fetchSellerStats(profile.id)
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-secondary">Перенаправление на вход…</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{loading ? 'Загрузка...' : 'Профиль не найден'}</div>
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

  const returnTo = searchParams.get('returnTo')

  return (
    <div className="min-h-screen pb-20 bg-[#f4f4f4]">
      <Navbar />
      <div className="w-full mx-auto max-w-lg px-0">
        <div className="w-full mx-auto max-w-lg">
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
          {/* Tabs — только для своего профиля */}
          {isOwnProfile && (
          <div className="flex gap-1 mb-2 border-b border-[#e5e7eb] overflow-x-auto scrollbar-hide bg-white px-3">
            <span className="px-3 py-2 font-medium text-sm border-b-2 whitespace-nowrap flex-shrink-0 border-brand-accent text-[#111]">
              Профиль
            </span>
              <Link
                href="/settings"
                className="px-3 py-2 font-medium text-sm transition-colors border-b-2 whitespace-nowrap flex-shrink-0 border-transparent text-[#6b7280] hover:text-[#111]"
              >
                Настройки
              </Link>
            {(currentUser?.role === 'master' || currentUser?.role === 'seller') && (
              <button
                onClick={() => router.push('/pro')}
                className="px-3 py-2 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap flex-shrink-0 border-transparent text-brand-accent"
              >
                PRO / Подписка
              </button>
            )}
          </div>
          )}

          {/* Profile Tab Content */}
              <ProfileStrictHeader
                profile={profile}
                displayRoleLabel={roleLabels[displayRole as keyof typeof roleLabels] || roleLabels.client}
                isOwnProfile={isOwnProfile}
                isFollowing={isFollowing}
                followLoading={followLoading}
                followersCount={followersCount}
                followingCount={followingCount}
                profileSubcategories={profileSubcategories}
                productsCount={productsCount}
                onFollow={toggleFollow}
                onMessage={handleStartChat}
                onFollowersClick={() => setShowFollowModal('followers')}
                onEdit={() => router.push('/settings')}
                backHref={returnTo || null}
              />

              {(profile.role === 'master' || profile.role === 'seller') && profileStories.length > 0 && (
                <div className="bg-white px-3.5 py-3 mt-2">
                  <StoriesCircle
                    stories={profileStories}
                    currentUser={currentUser}
                    isOwnProfile={isOwnProfile}
                    onStoryCreated={() => {
                      const pid = Array.isArray(params.id) ? params.id[0] : params.id
                      if (pid) fetchProfileStories(pid)
                    }}
                  />
                </div>
              )}

              {profile.role === 'master' &&
                (profileServices.length > 0 || profileSubcategories.length > 0) && (
                <>
                  <ProfileServicesRow
                    serviceNames={
                      profileServices.length > 0
                        ? profileServices.map((s) => s.name)
                        : profileSubcategories.map((s) => s.name)
                    }
                    onClick={() => setShowServicesSheet(true)}
                  />
                  <ProfileServicesSheet
                    open={showServicesSheet}
                    services={
                      profileServices.length > 0
                        ? profileServices
                        : profileSubcategories.map((s) => ({ id: s.id, name: s.name }) as Service)
                    }
                    onClose={() => setShowServicesSheet(false)}
                  />
                </>
              )}

              {profile.role === 'master' && !reviewsExpanded && (
                <div ref={reviewsSectionRef}>
                  <ProfileReviewsPreview
                    reviews={masterReviews}
                    totalCount={profile.master_reviews_count ?? masterReviews.length}
                    loading={reviewsLoading && !reviewsFetched}
                    onShowAll={() => {
                      setReviewsExpanded(true)
                      if (!reviewsFetched) {
                        setReviewsFetched(true)
                        const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                        if (profileId) fetchMasterReviews(profileId)
                      }
                    }}
                  />
                </div>
              )}

              {profile.role === 'seller' && !reviewsExpanded && (
                <div ref={reviewsSectionRef}>
                  <ProfileReviewsPreview
                    reviews={sellerReviews}
                    totalCount={profile.seller_reviews_count ?? sellerReviews.length}
                    loading={reviewsLoading && !reviewsFetched}
                    onShowAll={() => {
                      setReviewsExpanded(true)
                      if (!reviewsFetched) {
                        setReviewsFetched(true)
                        const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                        if (profileId) fetchSellerReviews(profileId)
                      }
                    }}
                  />
                </div>
              )}

              {profile.role === 'seller' && (
                <SellerProductsSection
                  products={products}
                  totalCount={productsCount || products.length}
                  isOwnProfile={isOwnProfile}
                  storeAddress={profile.store_address}
                  city={profile.city}
                  hasMap={isOwnProfile && profile.seller_lat != null && profile.seller_lng != null}
                  onShowMap={() => setShowStoresMap(true)}
                  hasMore={productsHasMore}
                  loadMoreRef={productsLoadMoreSentinelRef}
                />
              )}

              {profile.role === 'master' && reviewsExpanded && (
                <div ref={reviewsSectionRef} className="bg-white mt-2 px-3.5 py-3.5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-medium text-[#111111]">
                      Отзывы · {profile.master_reviews_count ?? masterReviews.length}
                    </p>
                    <button
                      type="button"
                      onClick={() => setReviewsExpanded(false)}
                      className="text-[11px] text-[#9ca3af]"
                    >
                      Свернуть
                    </button>
                  </div>
                  <div className="overflow-hidden flex flex-col rounded-xl border border-[#e5e7eb]" style={{ maxHeight: '600px' }}>
                            {/* Список отзывов (прокручиваемая область) */}
                            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 max-h-[450px]">
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
                </div>
              )}

              {profile.role === 'seller' && reviewsExpanded && (
                <div ref={reviewsSectionRef} className="bg-white mt-2 px-3.5 py-3.5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-medium text-[#111111]">
                      Отзывы · {profile.seller_reviews_count ?? sellerReviews.length}
                    </p>
                    <button type="button" onClick={() => setReviewsExpanded(false)} className="text-[11px] text-[#9ca3af]">
                      Свернуть
                    </button>
                  </div>
                  {currentUser && !isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => { setShowReviewForm(true); setEditingReview(null) }}
                      className="mb-3 w-full bg-brand-accent text-white text-[12px] font-medium py-2.5 rounded-[10px]"
                    >
                      Оставить отзыв
                    </button>
                  )}
                  {showReviewForm && currentUser && !isOwnProfile && (
                    <div className="mb-4">
                      <ReviewForm
                        targetId={Array.isArray(params.id) ? params.id[0] : params.id}
                        targetType="seller"
                        currentUserId={currentUser.id}
                        existingReview={editingReview}
                        onSuccess={() => {
                          setShowReviewForm(false)
                          setEditingReview(null)
                          const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                          if (profileId) { fetchSellerReviews(profileId); fetchProfile() }
                        }}
                        onCancel={() => { setShowReviewForm(false); setEditingReview(null) }}
                      />
                    </div>
                  )}
                  <div className="space-y-3 max-h-[450px] overflow-y-auto">
                    {reviewsLoading ? (
                      <p className="text-center text-[12px] text-[#9ca3af] py-8">Загрузка…</p>
                    ) : sellerReviews.length === 0 && productReviews.length === 0 ? (
                      <p className="text-center text-[12px] text-[#9ca3af] py-8">Пока нет отзывов</p>
                    ) : (
                      <>
                        {sellerReviews.map((review) => (
                          <ReviewCard
                            key={review.id}
                            review={review}
                            reviewType="seller"
                            currentUser={currentUser}
                            onReply={(reviewId) => setReplyingToReview(replyingToReview === reviewId ? null : reviewId)}
                            onEdit={(review) => { setEditingReview(review); setShowReviewForm(true) }}
                            onDelete={async (reviewId) => {
                              if (!confirm('Удалить отзыв?')) return
                              try {
                                const { error } = await supabase.from('seller_reviews').delete().eq('id', reviewId)
                                if (error) throw error
                                const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                                if (profileId) { fetchSellerReviews(profileId); fetchProfile() }
                              } catch (e) { console.error(e); alert('Ошибка при удалении') }
                            }}
                          />
                        ))}
                        {productReviews.map((review) => (
                          <ReviewCard
                            key={review.id}
                            review={review}
                            reviewType="product"
                            currentUser={currentUser}
                            onReply={(reviewId) => setReplyingToReview(replyingToReview === reviewId ? null : reviewId)}
                            onEdit={(review) => { setEditingReview(review); setShowReviewForm(true) }}
                            onDelete={async (reviewId) => {
                              if (!confirm('Удалить отзыв?')) return
                              try {
                                const { error } = await supabase.from('product_reviews').delete().eq('id', reviewId)
                                if (error) throw error
                                const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                                if (profileId) { fetchProductReviews(profileId); fetchSellerStats(profileId) }
                              } catch (e) { console.error(e); alert('Ошибка при удалении') }
                            }}
                          />
                        ))}
                      </>
                    )}
                  </div>
                  {replyingToReview && currentUser && (
                    <ReviewReplyForm
                      reviewId={replyingToReview}
                      reviewType="seller"
                      currentUserId={currentUser.id}
                      onSuccess={() => {
                        setReplyingToReview(null)
                        const profileId = Array.isArray(params.id) ? params.id[0] : params.id
                        if (profileId) { fetchSellerReviews(profileId); fetchProductReviews(profileId) }
                      }}
                      onCancel={() => setReplyingToReview(null)}
                    />
                  )}
                </div>
              )}

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

              {/* Portfolio for Masters - Render-on-Demand */}
              {profile.role === 'master' && (
                <div ref={portfolioSectionRef} className="bg-white mt-2 px-3.5 pt-3.5 pb-1 w-full">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[13px] font-medium text-[#111111]">Портфолио</p>
                    <div className="flex items-center gap-2">
                      {portfolioHasMore && (
                        <button
                          type="button"
                          onClick={() => void loadMorePortfolio()}
                          disabled={loadingMorePortfolio}
                          className="text-[11px] font-medium text-brand-accent disabled:opacity-50"
                        >
                          {loadingMorePortfolio ? '…' : 'Все →'}
                        </button>
                      )}
                      {isOwnProfile && (
                        <Link
                          href="/portfolio/new"
                          className="text-[11px] font-medium text-brand-accent"
                        >
                          + Добавить
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

        </div>
      </div>

      {/* Модалка: список подписчиков или подписок */}
      {showFollowModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowFollowModal(null)}>
          <div
            className="bg-bg-card border border-border-light rounded-2xl shadow-premium w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
              <h2 className="text-lg font-semibold text-graphite-secondary">
                {showFollowModal === 'followers' ? 'Подписчики' : 'Подписки'}
              </h2>
              <button
                type="button"
                onClick={() => setShowFollowModal(null)}
                className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
                aria-label="Закрыть"
              >
                <FiX className="w-5 h-5 text-graphite-secondary" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {followListLoading ? (
                <div className="flex justify-center py-8 text-text-secondary">Загрузка...</div>
              ) : followList.length === 0 ? (
                <div className="text-center py-8 text-text-secondary text-sm">
                  {showFollowModal === 'followers' ? 'Пока нет подписчиков' : 'Нет подписок'}
                </div>
              ) : (
                <ul className="space-y-2">
                  {followList.map((u) => (
                    <li key={u.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-bg-secondary/50 transition-colors">
                      <Link
                        href={`/profile/${u.id}`}
                        onClick={() => setShowFollowModal(null)}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-bg-secondary flex-shrink-0">
                          {u.avatar_url ? (
                            <Image src={u.avatar_url} alt="" fill className="object-cover" sizes="40px" />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-graphite-secondary font-semibold">
                              {u.full_name?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-graphite-secondary truncate block">{u.full_name || 'Без имени'}</span>
                          {u.city && <span className="text-xs text-text-secondary truncate block">{u.city}</span>}
                        </div>
                      </Link>
                      {isOwnProfile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            if (showFollowModal === 'following') unfollowUser(u.id)
                            else removeFollower(u.id)
                          }}
                          disabled={followActionId === u.id}
                          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-border-light text-graphite-secondary hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {followActionId === u.id ? '...' : showFollowModal === 'following' ? 'Отписаться' : 'Убрать'}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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


