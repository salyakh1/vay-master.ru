'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import {
  FiTrash2,
  FiCornerUpLeft,
  FiCheckCircle,
  FiGrid,
  FiCornerUpRight,
} from 'react-icons/fi'
import {
  polygonArea,
  polygonPerimeter,
  wouldCloseIntersect,
  snapToGrid,
  snapToAngle,
  segmentIndexNearPoint,
  closestPointOnSegment,
  PLANNER_GRID_STEP,
  MIN_AREA_M2,
  type Point,
} from '@/lib/planner-geometry'

type PlannerTab = 'room' | 'apartment' | 'yard' | 'house' | 'extension'
type SurfaceMode = 'floor' | 'walls'
type MeasureType = 'area' | 'volume'

type ServiceItem = {
  id: string
  name: string
  slug?: string
  subcategory_id?: string
  specialization_id?: string
}

type RecommendedMaster = {
  id: string
  full_name: string
  avatar_url?: string | null
  city?: string | null
  master_rating?: number | null
  master_reviews_count?: number | null
}

type RecommendedProduct = {
  id: string
  name: string
  price: number
  images?: string[] | null
  seller?: {
    id?: string
    full_name?: string | null
    avatar_url?: string | null
  } | null
  category_ref?: {
    name?: string | null
    section?: string | null
  } | null
}

const TABS: Array<{ id: PlannerTab; label: string }> = [
  { id: 'room', label: 'Комната' },
  { id: 'apartment', label: 'Квартира' },
  { id: 'yard', label: 'Двор' },
  { id: 'house', label: 'Дом' },
  { id: 'extension', label: 'Пристройка' },
]

/** Ключевые слова для фильтра услуг «Стены» — из нашей системы (services) */
const WALL_KEYWORDS = [
  'штукатур', 'шпакл', 'покрас', 'обои', 'плитк', 'панел', 'гипс', 'кирпич',
  'блок', 'бетон', 'изоляц', 'утепл', 'потолок', 'стен', 'окраск', 'штукатурк',
]

/** Ключевые слова для фильтра услуг «Пол» — из нашей системы (services) */
const FLOOR_KEYWORDS = [
  'стяжка', 'пол', 'ламинат', 'паркет', 'бетон', 'наливной', 'плитка',
  'полусухая', 'мокрая', 'армирован', 'укладка ламината', 'укладка паркета',
  'бетонирован', 'теплый пол',
]

export default function PlannerPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<PlannerTab>('room')
  const [mode, setMode] = useState<SurfaceMode>('floor')
  const [measureType, setMeasureType] = useState<MeasureType>('area')
  const [selectedServiceId, setSelectedServiceId] = useState<string>('')
  const [services, setServices] = useState<ServiceItem[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)

  const [wallHeight, setWallHeight] = useState(2.7)
  const [thicknessCm, setThicknessCm] = useState(1)
  const [workPrice, setWorkPrice] = useState('')
  const [materialPrice, setMaterialPrice] = useState('')
  const [priceUnit, setPriceUnit] = useState<'m2' | 'm3'>('m2')

  const [recommendedMasters, setRecommendedMasters] = useState<RecommendedMaster[]>([])
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)

  const [canvasWidth, setCanvasWidth] = useState(10)
  const [canvasHeight, setCanvasHeight] = useState(10)
  const [gridStep] = useState(PLANNER_GRID_STEP)
  const [snapToGridEnabled, setSnapToGridEnabled] = useState(true)
  const [snapTo45, setSnapTo45] = useState(true)
  const [points, setPoints] = useState<Point[]>([])
  const [isClosed, setIsClosed] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null)
  const [zoom, setZoom] = useState(1)
  const [reservePercent, setReservePercent] = useState(10)
  const [cutouts, setCutouts] = useState<Array<{ width: number; height: number }>>([])
  const [closeBlockedReason, setCloseBlockedReason] = useState<string | null>(null)
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null)
  const [history, setHistory] = useState<{ points: Point[]; isClosed: boolean }[]>([])
  const [redoStack, setRedoStack] = useState<{ points: Point[]; isClosed: boolean }[]>([])
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchDistanceRef = useRef<number | null>(null)
  const isPinchingRef = useRef(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const touchPinchRef = useRef<number | null>(null)
  const zoomRef = useRef(1)
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return

    const onTouchStart = (event: TouchEvent) => {
      event.stopPropagation()
      if (event.touches.length === 2) {
        event.preventDefault()
        const dx = event.touches[0].clientX - event.touches[1].clientX
        const dy = event.touches[0].clientY - event.touches[1].clientY
        touchPinchRef.current = Math.hypot(dx, dy)
        isPinchingRef.current = true
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && touchPinchRef.current) {
        event.preventDefault()
        const dx = event.touches[0].clientX - event.touches[1].clientX
        const dy = event.touches[0].clientY - event.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        const nextZoom = Math.min(3, Math.max(0.6, zoomRef.current * (dist / touchPinchRef.current)))
        setZoom(nextZoom)
        touchPinchRef.current = dist
      }
    }

    const onTouchEnd = (event: TouchEvent) => {
      event.stopPropagation()
      if (event.touches.length < 2) {
        touchPinchRef.current = null
        isPinchingRef.current = false
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
    el.addEventListener('touchcancel', onTouchEnd, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      fetchServices()
    }
  }, [user])

  const fetchServices = async () => {
    setServicesLoading(true)
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, slug, subcategory_id')
        .order('name', { ascending: true })

      if (servicesError) throw servicesError

      setServices((servicesData as ServiceItem[]) || [])
    } catch (error) {
      console.error('Error fetching services:', error)
      setServices([])
    } finally {
      setServicesLoading(false)
    }
  }

  const serviceOptions = useMemo(() => {
    const nameLower = (name: string) => name.toLowerCase()
    const base = services.filter((s) =>
      FLOOR_KEYWORDS.some((kw) => nameLower(s.name).includes(kw))
    )
    const hasWarmFloor = services.some((s) => nameLower(s.name).includes('теплый пол'))
    const warmFloorOption = hasWarmFloor ? [{ id: 'warm-floor', name: 'Теплый пол', slug: undefined, subcategory_id: undefined }] : []
    const list = [...base, ...warmFloorOption]
    return list.length > 0 ? list : services
  }, [services])

  const selectedServiceName = useMemo(() => {
    if (selectedServiceId === 'warm-floor') return 'Теплый пол'
    return services.find((service) => service.id === selectedServiceId)?.name || ''
  }, [services, selectedServiceId])

  const isWarmFloor = selectedServiceId === 'warm-floor'

  const normalizeKeyword = (value: string) => {
    if (value.length <= 4) return value
    if (/[аеиоуыяю]$/i.test(value)) {
      return value.slice(0, -1)
    }
    return value
  }

  const extractKeywords = (value: string) => {
    const stopWords = new Set([
      'укладка',
      'монтаж',
      'установка',
      'ремонт',
      'подготовка',
      'работы',
      'работа',
      'нанесение',
      'нанесения',
      'облицовка',
      'устройство',
      'под',
      'по',
      'для',
      'на',
      'в',
      'из',
      'с',
    ])
    const tokens = value
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s]+/gi, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => !stopWords.has(token) && token.length >= 3)
    const normalized = tokens.map(normalizeKeyword)
    return Array.from(new Set([...normalized, ...tokens])).slice(0, 6)
  }

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!selectedServiceId) {
        setRecommendedMasters([])
        setRecommendedProducts([])
        return
      }
      setRecommendationsLoading(true)
      try {
        const productsBase = supabase
          .from('products')
          .select(
            `id, name, price, images, seller:profiles(id, full_name, avatar_url), category_ref:product_categories(id, name, section, slug)`
          )
          .eq('in_stock', true)
          .eq('category_ref.section', 'construction')
          .order('created_at', { ascending: false })
          .limit(12)

        let profileIds: string[] = []
        if (selectedServiceId) {
          const keywords = extractKeywords(selectedServiceName || '')
          const orParts = keywords.flatMap((keyword) => {
            const safeKeyword = keyword.replace(/[%_]/g, '')
            return [`name.ilike.%${safeKeyword}%`, `description.ilike.%${safeKeyword}%`]
          })

          if (isWarmFloor) {
            const { data: warmServices, error: warmError } = await supabase
              .from('services')
              .select('id')
              .ilike('name', '%теплый пол%')
            if (!warmError && warmServices?.length) {
              const warmIds = (warmServices || []).map((row) => row.id as string)
              const { data, error } = await supabase
                .from('profile_services')
                .select('profile_id')
                .in('service_id', warmIds)
              if (!error && data) profileIds = data.map((row) => row.profile_id as string)
            }
          } else {
            const { data, error } = await supabase
              .from('profile_services')
              .select('profile_id')
              .eq('service_id', selectedServiceId)
            if (!error && data) profileIds = data.map((row) => row.profile_id as string)
          }

          const productsResult =
            orParts.length > 0
              ? await productsBase.or(orParts.join(','))
              : await productsBase
          if (productsResult.error) throw productsResult.error
          setRecommendedProducts((productsResult.data as RecommendedProduct[]) || [])
        } else {
          const productsResult = await productsBase
          if (productsResult.error) throw productsResult.error
          setRecommendedProducts((productsResult.data as RecommendedProduct[]) || [])
        }

        let mastersData: RecommendedMaster[] = []
        if (profileIds.length > 0) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, city, master_rating, master_reviews_count')
            .eq('role', 'master')
            .in('id', profileIds)
            .order('master_rating', { ascending: false, nullsFirst: false })
            .limit(12)
          if (!error && data) mastersData = data as RecommendedMaster[]
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, city, master_rating, master_reviews_count')
            .eq('role', 'master')
            .order('master_rating', { ascending: false, nullsFirst: false })
            .limit(12)
          if (!error && data) mastersData = data as RecommendedMaster[]
        }
        setRecommendedMasters(mastersData)
      } catch (error) {
        console.error('Error fetching recommendations:', error)
        setRecommendedProducts([])
        setRecommendedMasters([])
      } finally {
        setRecommendationsLoading(false)
      }
    }

    fetchRecommendations()
  }, [selectedServiceId, selectedServiceName, isWarmFloor])

  const filteredServices = useMemo(() => {
    const nameLower = (name: string) => name.toLowerCase()
    if (mode === 'walls') {
      const list = services.filter((s) =>
        WALL_KEYWORDS.some((kw) => nameLower(s.name).includes(kw))
      )
      return list.length > 0 ? list : services
    }
    return serviceOptions.length > 0 ? serviceOptions : services
  }, [services, mode, serviceOptions])

  const materialsListEmpty = !servicesLoading && filteredServices.length === 0

  const polygonClosed = isClosed && points.length >= 3

  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev, { points: [...points], isClosed }])
    setRedoStack([])
  }, [points, isClosed])

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    setRedoStack((r) => [...r, { points: [...points], isClosed }])
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setPoints(prev.points)
    setIsClosed(prev.isClosed)
    setCloseBlockedReason(null)
    setDraggingPointIndex(null)
  }, [history, points, isClosed])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((r) => r.slice(0, -1))
    setPoints(next.points)
    setIsClosed(next.isClosed)
    setCloseBlockedReason(null)
  }, [redoStack])

  const metersToParts = (meters: number) => {
    if (!Number.isFinite(meters)) return { m: 0, cm: 0 }
    const totalCm = Math.round(meters * 100)
    const m = Math.floor(totalCm / 100)
    const cm = totalCm % 100
    return { m, cm }
  }

  const estimateCharWidth = (char: string) => {
    if (char === '.') return 0.04
    if (char === ' ' || char === '№') return 0.05
    return 0.065
  }

  const buildLabelParts = (meters: number) => {
    const label = meters.toFixed(2)
    const segments = label.split('')
    const gap = 0.09
    const widths = segments.map((segment) => estimateCharWidth(segment))
    const total = widths.reduce((sum, w) => sum + w, 0) + gap * (segments.length - 1)
    return { segments, widths, total, gap }
  }

  const buildTextParts = (text: string) => {
    const segments = text.split('')
    const gap = 0.06
    const widths = segments.map((segment) => estimateCharWidth(segment) + gap)
    const total = widths.reduce((sum, w) => sum + w, 0)
    return { segments, widths, total, gap }
  }

  const floorArea = useMemo(() => (polygonClosed ? polygonArea(points) : 0), [points, polygonClosed])
  const perimeter = useMemo(() => (polygonClosed ? polygonPerimeter(points) : 0), [points, polygonClosed])

  const cutoutsArea = useMemo(
    () => cutouts.reduce((sum, c) => sum + Math.max(0, c.width) * Math.max(0, c.height), 0),
    [cutouts]
  )
  const wallAreaTotal = useMemo(() => {
    const h = Math.max(0, wallHeight)
    return perimeter * h
  }, [perimeter, wallHeight])
  const wallAreaNet = Math.max(0, wallAreaTotal - cutoutsArea)

  const baseArea = mode === 'floor' ? floorArea : wallAreaNet
  const thicknessM = Math.max(0, thicknessCm) / 100
  const volume = floorArea * thicknessM
  const reserveMultiplier = 1 + Math.max(0, reservePercent) / 100
  const volumeWithReserve = volume * reserveMultiplier
  const quantityByUnit =
    mode === 'floor' && priceUnit === 'm3'
      ? volumeWithReserve
      : baseArea
  const workTotal = Number(workPrice || 0) * quantityByUnit
  const materialTotal = Number(materialPrice || 0) * quantityByUnit
  const grandTotal = workTotal + materialTotal
  const showRecommendations = polygonClosed && floorArea > 5

  useEffect(() => {
    if (!showRecommendations || selectedServiceId) return
    setRecommendationsLoading(true)
    const loadDefaultRecommendations = async () => {
      try {
        const [productsResult, mastersResult] = await Promise.all([
          supabase
            .from('products')
            .select(
              `id, name, price, images, seller:profiles(id, full_name, avatar_url), category_ref:product_categories(id, name, section, slug)`
            )
            .eq('in_stock', true)
            .eq('category_ref.section', 'construction')
            .order('created_at', { ascending: false })
            .limit(12),
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url, city, master_rating, master_reviews_count')
            .eq('role', 'master')
            .order('master_rating', { ascending: false, nullsFirst: false })
            .limit(12),
        ])
        setRecommendedProducts((productsResult.data as RecommendedProduct[]) || [])
        setRecommendedMasters((mastersResult.data as RecommendedMaster[]) || [])
      } catch (e) {
        console.error(e)
        setRecommendedProducts([])
        setRecommendedMasters([])
      } finally {
        setRecommendationsLoading(false)
      }
    }
    loadDefaultRecommendations()
  }, [showRecommendations, selectedServiceId])

  const previewWidth = Math.max(1, canvasWidth)
  const previewHeight = Math.max(1, canvasHeight)

  const getPointFromEvent = (
    event: React.PointerEvent<SVGSVGElement>,
    lastPoint?: Point | null
  ): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    const rawX = ((event.clientX - rect.left) / rect.width) * previewWidth
    const rawY = ((event.clientY - rect.top) / rect.height) * previewHeight
    const x = rawX / zoom
    const y = rawY / zoom
    let p: Point = { x, y }
    if (snapToGridEnabled) p = snapToGrid(p, gridStep)
    if (lastPoint && snapTo45) {
      const len = Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y)
      if (len >= 0.05) p = snapToAngle(lastPoint, p, len, true)
      if (snapToGridEnabled) p = snapToGrid(p, gridStep)
    }
    return p
  }

  const updatePointers = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    pointersRef.current.set(event.pointerId, { x, y })
  }

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch' && isPinchingRef.current) return
    svgRef.current?.setPointerCapture(event.pointerId)
    updatePointers(event)

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      isPinchingRef.current = true
      pinchDistanceRef.current = dist
      setIsDrawing(false)
      setCurrentPoint(null)
      return
    }

    if (isClosed) {
      const rect = event.currentTarget.getBoundingClientRect()
      const rawX = ((event.clientX - rect.left) / rect.width) * previewWidth / zoom
      const rawY = ((event.clientY - rect.top) / rect.height) * previewHeight / zoom
      const p: Point = { x: rawX, y: rawY }
      for (let i = 0; i < points.length; i++) {
        const dist = Math.hypot(p.x - points[i].x, p.y - points[i].y)
        if (dist <= 0.2) {
          setDraggingPointIndex(i)
          return
        }
      }
      const segIdx = segmentIndexNearPoint(points, p, 0.25)
      if (segIdx !== null) {
        const a = points[segIdx]
        const b = points[(segIdx + 1) % points.length]
        const proj = closestPointOnSegment(p, a, b)
        if (proj) {
          pushHistory()
          setPoints((prev) => {
            const next = [...prev]
            next.splice(segIdx + 1, 0, snapToGrid(proj.point, gridStep))
            return next
          })
        }
        return
      }
      return
    }

    setIsDrawing(true)
    setCurrentPoint(getPointFromEvent(event))
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch' && isPinchingRef.current) return
    updatePointers(event)

    if (isPinchingRef.current && pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values())
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (pinchDistanceRef.current) {
        const nextZoom = Math.min(3, Math.max(0.6, zoom * (dist / pinchDistanceRef.current)))
        setZoom(nextZoom)
        pinchDistanceRef.current = dist
      }
      return
    }

    if (draggingPointIndex !== null) {
      const newP = getPointFromEvent(event)
      setPoints((prev) => {
        const next = [...prev]
        next[draggingPointIndex!] = newP
        return next
      })
      return
    }

    if (!isDrawing || isClosed) return
    const last = points.length > 0 ? points[points.length - 1] : null
    setCurrentPoint(getPointFromEvent(event, last))
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId)
    svgRef.current?.releasePointerCapture(event.pointerId)

    if (isPinchingRef.current && pointersRef.current.size < 2) {
      isPinchingRef.current = false
      pinchDistanceRef.current = null
      return
    }

    if (draggingPointIndex !== null) {
      setDraggingPointIndex(null)
      return
    }

    if (!isDrawing) return
    const last = points.length > 0 ? points[points.length - 1] : null
    let nextPoint = currentPoint || getPointFromEvent(event, last)
    if (snapToGridEnabled) nextPoint = snapToGrid(nextPoint, gridStep)
    setIsDrawing(false)
    setCurrentPoint(null)

    setPoints((prev) => {
      const minDistance = Math.max(0.05, gridStep * 0.5)
      if (prev.length > 0) {
        const dist = Math.hypot(nextPoint.x - prev[prev.length - 1].x, nextPoint.y - prev[prev.length - 1].y)
        if (dist < minDistance) return prev
      }

      if (prev.length >= 2) {
        const first = prev[0]
        const closeDistance = Math.max(0.15, gridStep * 2)
        const distance = Math.hypot(nextPoint.x - first.x, nextPoint.y - first.y)
        if (distance <= closeDistance) {
          if (wouldCloseIntersect([...prev, nextPoint])) {
            setCloseBlockedReason('Замыкание отменено: контур самопересекается')
            return prev
          }
          setCloseBlockedReason(null)
          pushHistory()
          setIsClosed(true)
          return prev
        }
      }

      pushHistory()
      return [...prev, nextPoint]
    })
  }


  const handleUndoPoint = () => {
    if (points.length === 0) return
    pushHistory()
    setPoints((prev) => prev.slice(0, -1))
    setIsClosed(false)
    setCurrentPoint(null)
    setCloseBlockedReason(null)
  }

  const handleClear = () => {
    pushHistory()
    setPoints([])
    setIsClosed(false)
    setCurrentPoint(null)
    setCloseBlockedReason(null)
  }

  const handleDeletePoint = (index: number) => {
    if (points.length <= 3) return
    pushHistory()
    setPoints((prev) => prev.filter((_, i) => i !== index))
  }

  const centroid = useMemo(() => {
    if (!polygonClosed) return null
    let cx = 0
    let cy = 0
    let area = 0
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      const cross = a.x * b.y - b.x * a.y
      area += cross
      cx += (a.x + b.x) * cross
      cy += (a.y + b.y) * cross
    }
    if (area === 0) return null
    const factor = 1 / (3 * area)
    return { x: cx * factor, y: cy * factor }
  }, [points, polygonClosed])

  const handleCloseShape = () => {
    if (points.length < 3) return
    if (wouldCloseIntersect(points)) {
      setCloseBlockedReason('Контур самопересекается, замыкание невозможно')
      return
    }
    setCloseBlockedReason(null)
    pushHistory()
    setIsClosed(true)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-text-secondary">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-24">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-3 mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-graphite-secondary">Планерка</h1>
            <p className="text-sm text-text-secondary">
              Свободно рисуйте контур пальцем, замкните его и получите расчет.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={tab.id !== 'room'}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activeTab === tab.id
                    ? 'bg-brand-accent text-white border-brand-accent'
                    : 'bg-bg-card text-text-secondary border-border-light/60'
                } ${tab.id !== 'room' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab !== 'room' ? (
            <div className="rounded-2xl border border-border-light/60 bg-bg-card p-10 text-center text-text-secondary">
              Этот раздел в разработке. Сейчас доступен только режим «Комната».
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-6">
                <div className="rounded-2xl border border-border-light/60 bg-bg-card p-3">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-graphite-secondary">Полотно</h2>
                      <p className="text-xs text-text-secondary">
                        Сетка 10 см. Снап к 0°/90°/45°. Клик по сегменту — вставка точки; перетаскивание узла — редактирование.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <input
                          type="checkbox"
                          checked={snapToGridEnabled}
                          onChange={(e) => setSnapToGridEnabled(e.target.checked)}
                        />
                        Сетка
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <input
                          type="checkbox"
                          checked={snapTo45}
                          onChange={(e) => setSnapTo45(e.target.checked)}
                        />
                        45°
                      </label>
                    </div>
                    <span className="text-xs text-text-secondary">
                      {isClosed ? 'Контур замкнут' : `Точек: ${points.length}`}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border-light/60 bg-white p-0 relative">
                    <div className="absolute right-3 bottom-3 flex flex-row gap-2 z-20">
                      <button
                        type="button"
                        onClick={handleCloseShape}
                        className="w-10 h-10 rounded-full bg-brand-accent text-white shadow-md flex items-center justify-center"
                        title="Замкнуть"
                      >
                        <FiCheckCircle size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={handleUndoPoint}
                        disabled={points.length === 0}
                        className="w-10 h-10 rounded-full bg-white border border-border-light/60 text-graphite-secondary shadow-md flex items-center justify-center disabled:opacity-50"
                        title="Удалить последнюю точку"
                      >
                        <FiCornerUpLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={handleUndo}
                        disabled={history.length === 0}
                        className="w-10 h-10 rounded-full bg-white border border-border-light/60 text-graphite-secondary shadow-md flex items-center justify-center disabled:opacity-50"
                        title="Отменить (Undo)"
                      >
                        <FiCornerUpLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleRedo}
                        disabled={redoStack.length === 0}
                        className="w-10 h-10 rounded-full bg-white border border-border-light/60 text-graphite-secondary shadow-md flex items-center justify-center disabled:opacity-50"
                        title="Повторить (Redo)"
                      >
                        <FiCornerUpRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleClear}
                        className="w-10 h-10 rounded-full bg-white border border-border-light/60 text-graphite-secondary shadow-md flex items-center justify-center"
                        title="Очистить"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                    {closeBlockedReason && (
                      <div className="absolute left-3 bottom-3 right-24 px-2 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs z-20">
                        {closeBlockedReason}
                      </div>
                    )}
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${previewWidth} ${previewHeight}`}
                      className="w-full h-[480px] touch-none block"
                      style={{ touchAction: 'none' }}
                      preserveAspectRatio="none"
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      shapeRendering="crispEdges"
                    >
                      <defs>
                        <pattern id="grid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse">
                          <path
                            d={`M 0 0 L 0 ${gridStep} ${gridStep} ${gridStep}`}
                            fill="none"
                            stroke="#eef2f6"
                            strokeWidth="0.02"
                          />
                        </pattern>
                        <pattern id="gridBold" width={gridStep * 5} height={gridStep * 5} patternUnits="userSpaceOnUse">
                          <path
                            d={`M 0 0 L 0 ${gridStep * 5} ${gridStep * 5} ${gridStep * 5}`}
                            fill="none"
                            stroke="#dde5ee"
                            strokeWidth="0.03"
                          />
                        </pattern>
                        <filter id="shapeShadow" x="-30%" y="-30%" width="160%" height="160%">
                          <feDropShadow dx="0" dy="0.03" stdDeviation="0.06" floodColor="#0f172a" floodOpacity="0.08" />
                        </filter>
                        <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
                          <feDropShadow dx="0" dy="0.02" stdDeviation="0.04" floodColor="#0f172a" floodOpacity="0.18" />
                        </filter>
                      </defs>
                      <g transform={`scale(${zoom})`} transformOrigin="50% 50%">
                        <rect width="100%" height="100%" fill="#f8fafc" />
                        <rect width="100%" height="100%" fill="url(#grid)" />
                        <rect width="100%" height="100%" fill="url(#gridBold)" />

                        {points.length > 1 && !isClosed && (
                          <polyline
                            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="#9ecfd7"
                            strokeWidth="0.08"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#shapeShadow)"
                          />
                        )}

                        {points.length > 2 && isClosed && (
                          <polygon
                            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="#ffffff"
                            stroke="#9ecfd7"
                            strokeWidth="0.16"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#shapeShadow)"
                          />
                        )}

                        {points.length > 2 && isClosed && (
                          <polygon
                            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="#cdd9e2"
                            strokeWidth="0.03"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {points.length > 1 &&
                          points.slice(1).map((p, index) => {
                            const prev = points[index]
                            const midX = (prev.x + p.x) / 2
                            const midY = (prev.y + p.y) / 2
                            const length = Math.hypot(p.x - prev.x, p.y - prev.y)
                            const labelParts = buildLabelParts(length)
                            const dx = p.x - prev.x
                            const dy = p.y - prev.y
                            let angle = (Math.atan2(dy, dx) * 180) / Math.PI
                            if (angle > 90 || angle < -90) angle += 180
                            const len = Math.hypot(dx, dy) || 1
                            const nx = -dy / len
                            const ny = dx / len
                            const offset = 0.4
                            const labelX = midX + nx * offset
                            const labelY = midY + ny * offset
                            return (
                              <g key={`len-${index}`} transform={`translate(${labelX} ${labelY}) rotate(${angle})`}>
                                <text
                                  x={0}
                                  y={0}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fontSize="0.32"
                                  fill="#1f2937"
                                  fontWeight="500"
                                  letterSpacing="0.03em"
                                  direction="ltr"
                                  unicodeBidi="plaintext"
                                >
                                  {labelParts.segments.map((segment, segIndex) => {
                                    const offsetX =
                                      labelParts.widths.slice(0, segIndex).reduce((sum, w) => sum + w, 0) +
                                      labelParts.gap * segIndex -
                                      labelParts.total / 2
                                    return (
                                      <tspan key={`${segment}-${segIndex}`} x={offsetX} dy={0}>
                                        {segment}
                                      </tspan>
                                    )
                                  })}
                                </text>
                              </g>
                            )
                          })}

                        {!isClosed && points.length > 0 && currentPoint && (
                          <line
                            x1={points[points.length - 1].x}
                            y1={points[points.length - 1].y}
                            x2={currentPoint.x}
                            y2={currentPoint.y}
                            stroke="#94a3b8"
                            strokeWidth="0.03"
                            strokeDasharray="0.06 0.06"
                            strokeLinecap="round"
                          />
                        )}

                        {!isClosed && points.length > 0 && currentPoint && (() => {
                          const length = Math.hypot(
                            currentPoint.x - points[points.length - 1].x,
                            currentPoint.y - points[points.length - 1].y
                          )
                          const labelParts = buildLabelParts(length)
                          const midX = (points[points.length - 1].x + currentPoint.x) / 2
                          const midY = (points[points.length - 1].y + currentPoint.y) / 2
                          return (
                            <g transform={`translate(${midX} ${midY})`}>
                              <text
                                x={0}
                                y={-0.45}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="0.32"
                                fill="#64748b"
                                fontWeight="500"
                                letterSpacing="0.03em"
                                direction="ltr"
                                unicodeBidi="plaintext"
                              >
                                {labelParts.segments.map((segment, segIndex) => {
                                  const offsetX =
                                    labelParts.widths.slice(0, segIndex).reduce((sum, w) => sum + w, 0) +
                                    labelParts.gap * segIndex -
                                    labelParts.total / 2
                                  return (
                                    <tspan key={`${segment}-${segIndex}`} x={offsetX} dy={0}>
                                      {segment}
                                    </tspan>
                                  )
                                })}
                              </text>
                            </g>
                          )
                        })()}

                        {points.map((p, index) => (
                          <g
                            key={`node-${index}`}
                            onContextMenu={(e) => {
                              if (isClosed && points.length > 3) {
                                e.preventDefault()
                                handleDeletePoint(index)
                              }
                            }}
                            style={{ cursor: isClosed ? (draggingPointIndex === index ? 'grabbing' : 'grab') : 'default' }}
                          >
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isClosed ? 0.12 : 0.07}
                              fill={draggingPointIndex === index ? '#9ecfd7' : '#f8fafc'}
                              stroke="#6b7280"
                              strokeWidth="0.03"
                              filter="url(#nodeShadow)"
                            />
                            {isClosed && points.length > 3 && (
                              <title>Перетащите для перемещения. ПКМ — удалить точку.</title>
                            )}
                          </g>
                        ))}

                        {points.length >= 3 && !isClosed && (
                          <circle
                            cx={points[0].x}
                            cy={points[0].y}
                            r="0.1"
                            fill="none"
                            stroke="#9ecfd7"
                            strokeWidth="0.04"
                            strokeDasharray="0.06 0.04"
                          />
                        )}

                        {polygonClosed && centroid && (
                          <g>
                            <text
                              x={centroid.x}
                              y={centroid.y}
                              textAnchor="start"
                              dominantBaseline="middle"
                              fontSize="0.3"
                              fill="#111827"
                              fontWeight="600"
                              letterSpacing="0.02em"
                              direction="ltr"
                              unicodeBidi="plaintext"
                            >
                              {(() => {
                                const parts = buildTextParts(`${floorArea.toFixed(2)} м²`)
                                return parts.segments.map((segment, segIndex) => {
                                  const offsetX =
                                    parts.widths.slice(0, segIndex).reduce((sum, w) => sum + w, 0) +
                                    parts.gap * segIndex -
                                    parts.total / 2
                                  return (
                                    <tspan key={`${segment}-${segIndex}`} x={centroid.x + offsetX} dy={0}>
                                      {segment}
                                    </tspan>
                                  )
                                })
                              })()}
                            </text>
                          </g>
                        )}
                      </g>
                    </svg>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-light/60 bg-bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-text-secondary">Материал и нанесение</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMode('floor')}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                          mode === 'floor'
                            ? 'bg-brand-accent text-white border-brand-accent'
                            : 'bg-white text-text-secondary border-border-light/60'
                        }`}
                      >
                        Пол
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('walls')}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                          mode === 'walls'
                            ? 'bg-brand-accent text-white border-brand-accent'
                            : 'bg-white text-text-secondary border-border-light/60'
                        }`}
                      >
                        Стены
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-text-secondary col-span-2">
                      Материал для {mode === 'floor' ? 'пола' : 'стен'} (из нашей системы)
                      <select
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        className="input w-full mt-1 h-10 border border-border-light bg-bg-primary rounded-lg focus:border-brand-accent focus:ring-1 focus:ring-brand-accent [&:invalid]:border-border-light"
                        style={{ borderColor: 'var(--border-light, #e2e8f0)' }}
                        aria-invalid="false"
                      >
                        <option value="">
                          {servicesLoading ? 'Загрузка...' : 'Выберите материал / услугу'}
                        </option>
                        {filteredServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                      {materialsListEmpty && (
                        <p className="mt-1.5 text-[11px] text-amber-600">
                          В системе пока нет услуг. Добавьте услуги в админке (раздел «Услуги» или «Специализации»).
                        </p>
                      )}
                    </label>
                    {mode === 'floor' && (
                      <>
                        <label className="text-xs text-text-secondary">
                          Толщина (см)
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={thicknessCm}
                            onChange={(e) => setThicknessCm(Number(e.target.value))}
                            className="input w-full mt-1 h-10"
                          />
                        </label>
                        <label className="text-xs text-text-secondary">
                          Запас (%)
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={reservePercent}
                            onChange={(e) => setReservePercent(Number(e.target.value))}
                            className="input w-full mt-1 h-10"
                          />
                        </label>
                      </>
                    )}
                    {mode === 'walls' && (
                      <>
                        <label className="text-xs text-text-secondary col-span-2">
                          Высота потолка (м)
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={wallHeight}
                            onChange={(e) => setWallHeight(Number(e.target.value))}
                            className="input w-full mt-1 h-10"
                          />
                        </label>
                        <div className="col-span-2 text-xs text-text-secondary">
                          Вырезы (м) — площадь вычитается из общей
                          <div className="mt-1 space-y-1">
                            {cutouts.map((c, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  placeholder="Ширина"
                                  value={c.width || ''}
                                  onChange={(e) =>
                                    setCutouts((prev) => {
                                      const n = [...prev]
                                      n[i] = { ...n[i], width: Number(e.target.value) || 0 }
                                      return n
                                    })
                                  }
                                  className="input flex-1 h-9"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  placeholder="Высота"
                                  value={c.height || ''}
                                  onChange={(e) =>
                                    setCutouts((prev) => {
                                      const n = [...prev]
                                      n[i] = { ...n[i], height: Number(e.target.value) || 0 }
                                      return n
                                    })
                                  }
                                  className="input flex-1 h-9"
                                />
                                <button
                                  type="button"
                                  onClick={() => setCutouts((prev) => prev.filter((_, j) => j !== i))}
                                  className="text-red-600 hover:underline text-[11px]"
                                >
                                  Удалить
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setCutouts((prev) => [...prev, { width: 0, height: 0 }])}
                              className="text-brand-accent hover:underline text-[11px]"
                            >
                              + Добавить вырез
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    <label className="text-xs text-text-secondary">
                      Ед. цены
                      <select
                        value={priceUnit}
                        onChange={(e) => setPriceUnit(e.target.value as 'm2' | 'm3')}
                        className="input w-full mt-1 h-10"
                      >
                        <option value="m2">за м²</option>
                        <option value="m3">за м³</option>
                      </select>
                    </label>
                    <label className="text-xs text-text-secondary">
                      Цена работы
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={workPrice}
                        onChange={(e) => setWorkPrice(e.target.value)}
                        className="input w-full mt-1 h-10"
                        placeholder="₽"
                      />
                    </label>
                    <label className="text-xs text-text-secondary">
                      Цена материала
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={materialPrice}
                        onChange={(e) => setMaterialPrice(e.target.value)}
                        className="input w-full mt-1 h-10"
                        placeholder="₽"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-border-light/60 bg-bg-card p-4">
                  <div className="flex items-center gap-2 text-xs text-text-secondary mb-3">
                    <FiCheckCircle size={14} />
                    Расчет
                  </div>
                  {polygonClosed && floorArea > 0 && floorArea < MIN_AREA_M2 && (
                    <div className="mb-2 px-2 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs">
                      Минимальная площадь для рекомендаций: {MIN_AREA_M2} м²
                    </div>
                  )}
                  <div className="text-sm text-text-secondary">
                    <div className="text-[11px] text-text-secondary mb-1">
                      {mode === 'floor' ? 'Пол' : 'Стены'}
                    </div>
                    <div className="text-lg font-semibold text-graphite-secondary">
                      {mode === 'floor' ? (
                        <>Площадь: {floorArea.toFixed(2)} м²</>
                      ) : (
                        <>Чистая площадь: {baseArea.toFixed(2)} м²</>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-text-secondary">
                    {!polygonClosed ? (
                      <span>Замкните контур, чтобы получить расчет.</span>
                    ) : mode === 'floor' ? (
                      <>
                        <div className="text-[11px]">Периметр: {perimeter.toFixed(2)} м</div>
                        <div className="text-[11px]">Объем: {volume.toFixed(3)} м³</div>
                        <div className="text-[11px]">Объем с запасом ({reservePercent}%): {volumeWithReserve.toFixed(3)} м³</div>
                        <span className="block mt-1">
                          Нужно покрытия: <strong>{baseArea.toFixed(2)} м²</strong>
                          {priceUnit === 'm3' && (
                            <> · материала с запасом: <strong>{volumeWithReserve.toFixed(3)} м³</strong></>
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="text-[11px]">Общая площадь: {wallAreaTotal.toFixed(2)} м²</div>
                        {cutoutsArea > 0 && (
                          <div className="text-[11px]">Площадь вырезов: {cutoutsArea.toFixed(2)} м²</div>
                        )}
                        <div className="text-[11px]">Периметр: {perimeter.toFixed(2)} м · Высота: {wallHeight} м</div>
                        <span className="block mt-1">
                          Чистая площадь: <strong>{baseArea.toFixed(2)} м²</strong>
                        </span>
                      </>
                    )}
                  </div>
                  {polygonClosed && mode === 'floor' && (
                    <div className="text-[11px] text-text-secondary mt-2">
                      Толщина: {thicknessCm} см · Запас: {reservePercent}%
                    </div>
                  )}
                  {polygonClosed && (workPrice || materialPrice) && (
                    <div className="text-[11px] text-text-secondary mt-2">
                      Работа: {workTotal.toLocaleString('ru-RU')} ₽ · Материал: {materialTotal.toLocaleString('ru-RU')} ₽ · Итог: {grandTotal.toLocaleString('ru-RU')} ₽
                    </div>
                  )}
                </div>

                {showRecommendations && (
                <div className="rounded-2xl border border-border-light/60 bg-bg-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold text-graphite-secondary">Товары и мастера из нашей системы</div>
                    <div className="text-xs text-text-secondary">
                      {selectedServiceName ? `По услуге: ${selectedServiceName}` : 'Популярные товары и мастера'}
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="text-xs text-text-secondary mb-2">Товары (каталог)</div>
                    {recommendationsLoading ? (
                      <div className="text-xs text-text-secondary">Загрузка...</div>
                    ) : recommendedProducts.length === 0 ? (
                      <div className="text-xs text-text-secondary">Нет товаров по выбранной услуге.</div>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                        {recommendedProducts.map((product) => (
                          <Link
                            key={product.id}
                            href={`/products/${product.id}`}
                            className="min-w-[220px] max-w-[220px] rounded-xl border border-border-light/60 bg-white shadow-sm overflow-hidden"
                          >
                            <div className="relative h-28 bg-bg-secondary overflow-hidden">
                              {product.images && product.images.length > 0 ? (
                                <Image
                                  src={product.images[0]}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  sizes="220px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">
                                  Нет фото
                                </div>
                              )}
                              <span className="absolute left-2 top-2 bg-brand-accent text-white text-[10px] px-2 py-0.5 rounded-full shadow">
                                Рекомендация
                              </span>
                            </div>
                            <div className="p-3">
                              <div className="text-[10px] text-text-secondary mb-1 truncate">
                                {selectedServiceName || 'Материал'}
                              </div>
                              <div className="text-sm font-semibold text-graphite-secondary line-clamp-2 min-h-[36px]">
                                {product.name}
                              </div>
                              <div className="text-sm font-semibold text-graphite-secondary mt-2">
                                {product.price.toLocaleString('ru-RU')} ₽
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-[11px] text-text-secondary">
                                <div className="w-6 h-6 rounded-full bg-graphite-primary text-white flex items-center justify-center overflow-hidden text-[10px] relative">
                                  {product.seller?.avatar_url ? (
                                    <Image
                                      src={product.seller.avatar_url}
                                      alt={product.seller.full_name || 'Продавец'}
                                      fill
                                      className="object-cover"
                                      sizes="24px"
                                    />
                                  ) : (
                                    product.seller?.full_name?.[0]?.toUpperCase() || 'П'
                                  )}
                                </div>
                                <span className="truncate">{product.seller?.full_name || 'Продавец'}</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-text-secondary mb-2">Мастера (из нашей системы)</div>
                    {recommendationsLoading ? (
                      <div className="text-xs text-text-secondary">Загрузка...</div>
                    ) : recommendedMasters.length === 0 ? (
                      <div className="text-xs text-text-secondary">Нет мастеров по выбранной услуге.</div>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                        {recommendedMasters.map((master) => (
                          <Link
                            key={master.id}
                            href={`/profile/${master.id}`}
                            className="min-w-[220px] max-w-[220px] rounded-xl border border-border-light/60 bg-white shadow-sm overflow-hidden p-3 flex flex-col gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-graphite-primary text-white flex items-center justify-center overflow-hidden text-sm font-semibold relative">
                                {master.avatar_url ? (
                                  <Image
                                    src={master.avatar_url}
                                    alt={master.full_name}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                  />
                                ) : (
                                  master.full_name?.[0]?.toUpperCase() || 'М'
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-graphite-secondary truncate">
                                  {master.full_name}
                                </div>
                                <div className="text-[11px] text-text-secondary truncate">
                                  {master.city || 'Город не указан'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-white bg-brand-accent px-2 py-0.5 rounded-full">
                                Рекомендация
                              </span>
                              <span className="text-[11px] text-text-secondary truncate">
                                {selectedServiceName || 'Услуга'}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                )}

                <div className="text-[11px] text-text-secondary">
                  Сетка 10 см, снап к углам 0°/90°/45°. После замыкания можно перетаскивать узлы, кликать по сегменту для вставки точки. Площадь — формула Шнурка; при площади &gt; 5 м² показываются рекомендации.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
