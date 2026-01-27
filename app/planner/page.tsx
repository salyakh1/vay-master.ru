'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/app/providers'
import { supabase } from '@/lib/supabase'
import {
  FiSquare,
  FiLayers,
  FiTrash2,
  FiCornerUpLeft,
  FiGrid,
  FiCheckCircle,
  FiMousePointer,
} from 'react-icons/fi'

type PlannerTab = 'room' | 'apartment' | 'yard' | 'house' | 'extension'
type SurfaceMode = 'floor' | 'walls'
type MeasureType = 'area' | 'volume'

type ServiceItem = {
  id: string
  name: string
  slug?: string
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

const WALL_KEYWORDS = [
  'штукатур',
  'шпакл',
  'покрас',
  'обои',
  'плитк',
  'панел',
  'гипс',
  'кирпич',
  'блок',
  'бетон',
  'изоляц',
  'утепл',
  'потолок',
]

const FLOOR_ALLOWED_NAMES = [
  'Армирование стяжки',
  'Бетонирование',
  'Мокрая стяжка',
  'Полусухая стяжка',
  'Стяжка пола',
  'Укладка ламината',
  'Укладка паркета',
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
  const [gridStep, setGridStep] = useState(0.03)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([])
  const [isClosed, setIsClosed] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)
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
        .select('id, name, slug, specialization_id')
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
    const allowed = new Set(FLOOR_ALLOWED_NAMES.map((name) => name.toLowerCase()))
    const base = services.filter((service) => allowed.has(service.name.toLowerCase()))
    const hasWarmFloor = services.some((service) => service.name.toLowerCase().includes('теплый пол'))
    const warmFloorOption = hasWarmFloor ? [{ id: 'warm-floor', name: 'Теплый пол' }] : []
    return [...base, ...warmFloorOption]
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
        const keywords = extractKeywords(selectedServiceName || '')
        const orParts = keywords.flatMap((keyword) => {
          const safeKeyword = keyword.replace(/[%_]/g, '')
          return [`name.ilike.%${safeKeyword}%`, `description.ilike.%${safeKeyword}%`]
        })

        const productsQuery = supabase
          .from('products')
          .select(
            `
            id,
            name,
            price,
            images,
            seller:profiles(id, full_name, avatar_url),
            category_ref:product_categories(id, name, section, slug)
          `
          )
          .eq('in_stock', true)
          .eq('category_ref.section', 'construction')
          .order('created_at', { ascending: false })
          .limit(12)

        const productsPromise = orParts.length > 0 ? productsQuery.or(orParts.join(',')) : productsQuery

        let profileIds: string[] = []
        if (isWarmFloor) {
          const { data: warmServices, error: warmError } = await supabase
            .from('services')
            .select('id')
            .ilike('name', '%теплый пол%')
          if (warmError) throw warmError
          const warmIds = (warmServices || []).map((row) => row.id as string)
          if (warmIds.length > 0) {
            const { data, error } = await supabase
              .from('profile_services')
              .select('profile_id')
              .in('service_id', warmIds)
            if (error) throw error
            profileIds = (data || []).map((row) => row.profile_id as string)
          }
        } else {
          const { data, error } = await supabase
            .from('profile_services')
            .select('profile_id')
            .eq('service_id', selectedServiceId)
          if (error) throw error
          profileIds = (data || []).map((row) => row.profile_id as string)
        }

        const [productsResult] = await Promise.all([productsPromise])
        if (productsResult.error) throw productsResult.error

        let mastersData: RecommendedMaster[] = []
        if (profileIds.length > 0) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, city, master_rating, master_reviews_count')
            .eq('role', 'master')
            .in('id', profileIds)
            .limit(12)

          if (error) throw error
          mastersData = (data as RecommendedMaster[]) || []
        }

        setRecommendedProducts((productsResult.data as RecommendedProduct[]) || [])
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
    if (mode === 'walls') {
      return services.filter((item) =>
        WALL_KEYWORDS.some((kw) => item.name.toLowerCase().includes(kw))
      )
    }
    return serviceOptions
  }, [services, mode, serviceOptions])

  const polygonClosed = isClosed && points.length >= 3

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

  const floorArea = useMemo(() => {
    if (!polygonClosed) return 0
    let sum = 0
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      sum += a.x * b.y - b.x * a.y
    }
    return Math.abs(sum) / 2
  }, [points, polygonClosed])

  const perimeter = useMemo(() => {
    if (!polygonClosed) return 0
    let total = 0
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      total += Math.hypot(b.x - a.x, b.y - a.y)
    }
    return total
  }, [points, polygonClosed])

  const wallArea = useMemo(() => {
    const safeWallHeight = Math.max(0, wallHeight)
    return perimeter * safeWallHeight
  }, [perimeter, wallHeight])

  const baseArea = mode === 'floor' ? floorArea : wallArea
  const thicknessM = Math.max(0, thicknessCm) / 100
  const volume = baseArea * thicknessM
  const quantityByUnit = priceUnit === 'm3' ? volume : baseArea
  const workTotal = Number(workPrice || 0) * quantityByUnit
  const materialTotal = Number(materialPrice || 0) * quantityByUnit
  const grandTotal = workTotal + materialTotal

  const previewWidth = Math.max(1, canvasWidth)
  const previewHeight = Math.max(1, canvasHeight)

  const getPointFromEvent = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const rawX = ((event.clientX - rect.left) / rect.width) * previewWidth
    const rawY = ((event.clientY - rect.top) / rect.height) * previewHeight
    const x = rawX / zoom
    const y = rawY / zoom
    const step = Math.max(0.01, gridStep)
    const snappedX = snapToGrid ? Math.round(x / step) * step : x
    const snappedY = snapToGrid ? Math.round(y / step) * step : y
    return { x: snappedX, y: snappedY }
  }

  const updatePointers = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    pointersRef.current.set(event.pointerId, { x, y })
  }

  const straightenPoint = (_last: { x: number; y: number }, next: { x: number; y: number }) => {
    // disable auto-straightening to allow angled lines
    return next
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

    if (isClosed) return
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

    if (!isDrawing || isClosed) return
    setCurrentPoint(getPointFromEvent(event))
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId)
    svgRef.current?.releasePointerCapture(event.pointerId)

    if (isPinchingRef.current && pointersRef.current.size < 2) {
      isPinchingRef.current = false
      pinchDistanceRef.current = null
      return
    }

    if (!isDrawing) return
    let nextPoint = currentPoint || getPointFromEvent(event)
    setIsDrawing(false)
    setCurrentPoint(null)

    setPoints((prev) => {
      const minDistance = Math.max(0.03, gridStep * 0.3)
      if (prev.length > 0) {
        const last = prev[prev.length - 1]
        nextPoint = straightenPoint(last, nextPoint)
        const distance = Math.hypot(nextPoint.x - last.x, nextPoint.y - last.y)
        if (distance < minDistance) return prev
      }

      if (prev.length >= 2) {
        const first = prev[0]
        const closeDistance = Math.max(0.12, gridStep * 2)
        const distance = Math.hypot(nextPoint.x - first.x, nextPoint.y - first.y)
        if (distance <= closeDistance) {
          setIsClosed(true)
          return prev
        }
      }

      return [...prev, nextPoint]
    })
  }


  const handleUndoPoint = () => {
    setPoints((prev) => prev.slice(0, -1))
    setIsClosed(false)
    setCurrentPoint(null)
  }

  const handleClear = () => {
    setPoints([])
    setIsClosed(false)
    setCurrentPoint(null)
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
    if (points.length >= 3) {
      setIsClosed(true)
    }
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
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-graphite-secondary">Полотно</h2>
                      <p className="text-xs text-text-secondary">
                        Ведите пальцем и отпускайте, чтобы строить прямые линии по точкам.
                      </p>
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
                        className="w-10 h-10 rounded-full bg-white border border-border-light/60 text-graphite-secondary shadow-md flex items-center justify-center"
                        title="Отменить"
                      >
                        <FiCornerUpLeft size={18} />
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
                          <circle
                            key={`${p.x}-${p.y}-${index}`}
                            cx={p.x}
                            cy={p.y}
                            r="0.07"
                            fill="#f8fafc"
                            stroke="#6b7280"
                            strokeWidth="0.03"
                            filter="url(#nodeShadow)"
                          />
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
                      Материал (услуга мастеров)
                      <select
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        className="input w-full mt-1 h-10"
                      >
                        <option value="" disabled>
                          {servicesLoading ? 'Загрузка...' : 'Выберите материал'}
                        </option>
                        {filteredServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-text-secondary">
                      Толщина слоя (см)
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={thicknessCm}
                        onChange={(e) => setThicknessCm(Number(e.target.value))}
                        className="input w-full mt-1 h-10"
                      />
                    </label>
                    {mode === 'walls' && (
                      <label className="text-xs text-text-secondary">
                        Высота стены (м)
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={wallHeight}
                          onChange={(e) => setWallHeight(Number(e.target.value))}
                          className="input w-full mt-1 h-10"
                        />
                      </label>
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
                  <div className="text-sm text-text-secondary">
                    <div className="text-[11px] text-text-secondary mb-1">
                      {mode === 'floor' ? 'Пол' : 'Стены'}
                    </div>
                    <div className="text-lg font-semibold text-graphite-secondary">
                      {baseArea.toFixed(2)} м²
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-text-secondary">
                    {!polygonClosed ? (
                      <span>Замкните контур, чтобы получить расчет.</span>
                    ) : measureType === 'area' ? (
                      <span>
                        Нужно покрытия: <strong>{baseArea.toFixed(2)} м²</strong>
                      </span>
                    ) : (
                      <span>
                        Нужно материала: <strong>{volume.toFixed(3)} м³</strong>
                      </span>
                    )}
                  </div>
                  {polygonClosed && (
                    <div className="text-[11px] text-text-secondary mt-2">
                      Объем: {volume.toFixed(3)} м³
                    </div>
                  )}
                  {measureType === 'volume' && polygonClosed && (
                    <div className="text-[11px] text-text-secondary mt-2">
                      Толщина: {thicknessCm} см, площадь: {baseArea.toFixed(2)} м²
                    </div>
                  )}
                  {polygonClosed && (
                    <div className="text-[11px] text-text-secondary mt-2">
                      Периметр: {perimeter.toFixed(2)} м
                      {mode === 'walls' && ` · Высота: ${wallHeight} м`}
                    </div>
                  )}
                  {polygonClosed && (workPrice || materialPrice) && (
                    <div className="text-[11px] text-text-secondary mt-2">
                      Работа: {workTotal.toLocaleString('ru-RU')} ₽ · Материал: {materialTotal.toLocaleString('ru-RU')} ₽ · Итог: {grandTotal.toLocaleString('ru-RU')} ₽
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border-light/60 bg-bg-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold text-graphite-secondary">Рекомендации</div>
                    <div className="text-xs text-text-secondary">
                      {selectedServiceName || 'Выберите услугу'}
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="text-xs text-text-secondary mb-2">Товары</div>
                    {recommendationsLoading ? (
                      <div className="text-xs text-text-secondary">Загрузка...</div>
                    ) : recommendedProducts.length === 0 ? (
                      <div className="text-xs text-text-secondary">Нет товаров по выбранной услуге.</div>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
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
                    <div className="text-xs text-text-secondary mb-2">Мастера</div>
                    {recommendationsLoading ? (
                      <div className="text-xs text-text-secondary">Загрузка...</div>
                    ) : recommendedMasters.length === 0 ? (
                      <div className="text-xs text-text-secondary">Нет мастеров по выбранной услуге.</div>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
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

                <div className="text-[11px] text-text-secondary">
                  Логика: вы рисуете свободную форму, контур фиксируется, затем считаем площадь и объем.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
